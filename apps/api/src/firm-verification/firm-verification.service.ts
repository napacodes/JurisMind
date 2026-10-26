import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { FirmVerificationDocumentType, FirmVerificationStatus, WorkspaceKind } from "../generated/prisma/enums";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "../auth/auth.types";
import { firmKycDocumentRequirementsFor } from "../config/env.validation";
import { createRequestId } from "../auth/auth.service";
import { PrismaService } from "../database/prisma.service";
import { decryptCredentialIdentifier, encryptCredentialIdentifier } from "../lawyer-verification/lawyer-credential-crypto";
import { PrivateDocumentStorage } from "../lawyer-verification/private-document-storage";
import { scopeCredentialStorageKey } from "../lawyer-verification/credential-document";
import type { ValidCredentialFile } from "../lawyer-verification/credential-document";
import type { FirmReviewDecision, FirmVerificationInput } from "./firm-verification.dto";

type Tx = Prisma.TransactionClient;
type FirmDocument = { type: FirmVerificationDocumentType; file: ValidCredentialFile; bytes: Buffer };

@Injectable()
export class FirmVerificationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
    @Inject(PrivateDocumentStorage) private readonly storage: PrivateDocumentStorage,
  ) {}

  async mine(workspaceId: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      await this.requireFirmAdmin(tx, workspaceId, actorId);
      await this.expireOverdue(tx, workspaceId);
      const submissions = await tx.firmVerificationSubmission.findMany({
        where: { workspaceId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, detailsCiphertext: true, status: true, reviewReason: true, reviewedAt: true, expiresAt: true, createdAt: true,
          documents: { select: { id: true, documentType: true, mediaType: true, sizeBytes: true, createdAt: true } } },
      });
      return { currentStatus: submissions[0]?.status ?? "NOT_SUBMITTED", submissions: submissions.map(({ detailsCiphertext, ...item }) => ({
        ...item, details: parseDetails(decryptCredentialIdentifier(detailsCiphertext, this.environment.lawyerCredentialEncryptionKey)),
      })) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async documentPolicy(workspaceId: string, actorId: string, sessionId: string, jurisdiction: string, legalForm: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      await this.requireFirmAdmin(tx, workspaceId, actorId);
      return { requiredDocuments: firmKycDocumentRequirementsFor(this.environment.firmKycDocumentPolicy, jurisdiction, legalForm) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async submit(workspaceId: string, actorId: string, sessionId: string, requestId: string,
    input: FirmVerificationInput, documents: FirmDocument[]) {
    const requiredDocuments = new Set(firmKycDocumentRequirementsFor(this.environment.firmKycDocumentPolicy, input.jurisdiction, input.legalForm));
    const providedDocuments = new Set(documents.map(({ type }) => type));
    if ([...requiredDocuments].some((type) => !providedDocuments.has(type))) throw new BadRequestException("Required firm verification documents are missing for this jurisdiction and legal form.");
    const staged: string[] = [];
    try {
      for (const document of documents) {
        const storageKey = scopeCredentialStorageKey(workspaceId, document.file.storageKey);
        await this.storage.put(storageKey, document.bytes);
        staged.push(storageKey);
      }
      return await this.prisma.$transaction(async (tx) => {
        await this.lockSession(tx, actorId, sessionId);
        await this.requireFirmAdmin(tx, workspaceId, actorId);
        await this.expireOverdue(tx, workspaceId);
        const latest = await tx.firmVerificationSubmission.findFirst({ where: { workspaceId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, status: true } });
        if (latest?.status === FirmVerificationStatus.PENDING) throw new ConflictException("A firm verification is already pending review.");
        if (latest?.status === FirmVerificationStatus.APPROVED) throw new ConflictException("This firm is already verified.");
        const detailsCiphertext = encryptCredentialIdentifier(JSON.stringify(input), this.environment.lawyerCredentialEncryptionKey);
        const documentRows = documents.map(({ type, file }) => ({
            documentType: type, storageKey: scopeCredentialStorageKey(workspaceId, file.storageKey), mediaType: file.mediaType, sizeBytes: file.sizeBytes, sha256: file.sha256,
          }));
        const submission = latest?.status === FirmVerificationStatus.DRAFT
          ? await tx.firmVerificationSubmission.update({ where: { id: latest.id }, data: {
            status: FirmVerificationStatus.PENDING, submittedById: actorId, detailsCiphertext,
            documents: { create: documentRows },
          }, select: { id: true, status: true, createdAt: true } })
          : await tx.firmVerificationSubmission.create({ data: {
            workspaceId, submittedById: actorId, detailsCiphertext,
            documents: { create: documentRows },
          }, select: { id: true, status: true, createdAt: true } });
        await tx.securityAuditEvent.createMany({ data: [
          { actorUserId: actorId, workspaceId, eventType: "FIRM_VERIFICATION_SUBMITTED", targetType: "FirmVerificationSubmission",
            targetId: submission.id, requestId: createRequestId(requestId), metadata: { status: submission.status, documentCount: documents.length } },
          ...documents.map(({ type, file }) => ({ actorUserId: actorId, workspaceId, eventType: "FIRM_VERIFICATION_DOCUMENT_UPLOADED",
            targetType: "FirmVerificationSubmission", targetId: submission.id, requestId: createRequestId(requestId),
            metadata: { documentType: type, mediaType: file.mediaType, sizeBytes: file.sizeBytes } })),
        ] });
        return submission;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      await Promise.all(staged.map((key) => this.storage.remove(key)));
      if (isConcurrentConflict(error)) throw new ConflictException("The firm verification conflicts with the current workspace state.");
      throw error;
    }
  }

  async saveDraft(workspaceId: string, actorId: string, sessionId: string, requestId: string, input: Partial<FirmVerificationInput>) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      await this.requireFirmAdmin(tx, workspaceId, actorId);
      await this.expireOverdue(tx, workspaceId);
      const latest = await tx.firmVerificationSubmission.findFirst({ where: { workspaceId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, status: true } });
      if (latest?.status === FirmVerificationStatus.PENDING || latest?.status === FirmVerificationStatus.APPROVED) {
        throw new ConflictException("A pending or approved firm verification cannot be edited.");
      }
      const detailsCiphertext = encryptCredentialIdentifier(JSON.stringify(input), this.environment.lawyerCredentialEncryptionKey);
      const draft = latest?.status === FirmVerificationStatus.DRAFT
        ? await tx.firmVerificationSubmission.update({ where: { id: latest.id }, data: { detailsCiphertext }, select: { id: true, status: true, createdAt: true } })
        : await tx.firmVerificationSubmission.create({ data: { workspaceId, submittedById: actorId,
          status: FirmVerificationStatus.DRAFT, detailsCiphertext }, select: { id: true, status: true, createdAt: true } });
      await tx.securityAuditEvent.create({ data: { actorUserId: actorId, workspaceId, eventType: "FIRM_VERIFICATION_DRAFT_SAVED",
        targetType: "FirmVerificationSubmission", targetId: draft.id, requestId: createRequestId(requestId),
        metadata: { status: draft.status, fieldCount: Object.keys(input).length } } });
      return draft;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listForReview(actorId: string, sessionId: string, status: "PENDING" | "ALL", page: number, pageSize: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePlatformAdmin(tx, actorId, sessionId);
      await this.expireOverdue(tx);
      const where = status === "ALL" ? { status: { not: FirmVerificationStatus.DRAFT } } : { status: FirmVerificationStatus.PENDING };
      const [total, submissions] = await Promise.all([
        tx.firmVerificationSubmission.count({ where }),
        tx.firmVerificationSubmission.findMany({ where, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          skip: (page - 1) * pageSize, take: pageSize,
          select: { id: true, workspaceId: true, status: true, reviewReason: true, reviewedAt: true, expiresAt: true, createdAt: true,
            workspace: { select: { id: true, name: true, kind: true } },
            submittedBy: { select: { id: true, fullName: true, email: true } },
            documents: { select: { id: true, documentType: true, mediaType: true, sizeBytes: true } } },
        }),
      ]);
      return { submissions, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async adminDetail(submissionId: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePlatformAdmin(tx, actorId, sessionId);
      const submission = await tx.firmVerificationSubmission.findUnique({ where: { id: submissionId }, select: {
        id: true, workspaceId: true, submittedById: true, detailsCiphertext: true, status: true, reviewReason: true,
        reviewedAt: true, expiresAt: true, createdAt: true,
        workspace: { select: { id: true, name: true, kind: true } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        documents: { select: { id: true, documentType: true, mediaType: true, sizeBytes: true, createdAt: true } },
      } });
      if (!submission) throw new NotFoundException("Firm verification not found.");
      if (submission.status === FirmVerificationStatus.DRAFT) throw new NotFoundException("Firm verification not found.");
      await this.expireOverdue(tx, undefined, submissionId);
      if (submission.status === FirmVerificationStatus.APPROVED && submission.expiresAt && submission.expiresAt <= new Date()) {
        submission.status = FirmVerificationStatus.EXPIRED;
      }
      const { detailsCiphertext, ...safeSubmission } = submission;
      return { ...safeSubmission, details: parseDetails(decryptCredentialIdentifier(detailsCiphertext, this.environment.lawyerCredentialEncryptionKey)) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async review(submissionId: string, actorId: string, sessionId: string, requestId: string,
    decision: FirmReviewDecision, reason: string | null) {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePlatformAdmin(tx, actorId, sessionId);
      await tx.$queryRaw`SELECT id FROM firm_verification_submissions WHERE id = ${submissionId}::uuid FOR UPDATE`;
      const submission = await tx.firmVerificationSubmission.findUnique({ where: { id: submissionId },
        select: { id: true, workspaceId: true, submittedById: true, status: true } });
      if (!submission) throw new NotFoundException("Firm verification not found.");
      const isWorkspaceMember = await tx.practiceMembership.findFirst({ where: { workspaceId: submission.workspaceId, userId: actorId }, select: { id: true } });
      if (submission.submittedById === actorId || isWorkspaceMember) throw new ForbiddenException("You cannot review your own firm's verification.");
      if (submission.status !== FirmVerificationStatus.PENDING) throw new ConflictException("This submission has already been reviewed.");
      const reviewedAt = new Date();
      const changed = await tx.firmVerificationSubmission.updateMany({ where: { id: submissionId, status: FirmVerificationStatus.PENDING },
        data: { status: decision, reviewReason: reason, reviewedById: actorId, reviewedAt,
          expiresAt: decision === FirmVerificationStatus.APPROVED && this.environment.firmVerificationValidityDays
            ? new Date(reviewedAt.getTime() + this.environment.firmVerificationValidityDays * 86_400_000) : null } });
      if (changed.count !== 1) throw new ConflictException("This submission changed during review.");
      await tx.securityAuditEvent.create({ data: {
        actorUserId: actorId, workspaceId: submission.workspaceId, eventType: "FIRM_VERIFICATION_REVIEWED",
        targetType: "FirmVerificationSubmission", targetId: submission.id, requestId: createRequestId(requestId),
        metadata: { fromStatus: submission.status, toStatus: decision, reasonProvided: Boolean(reason) },
      } });
      return { id: submission.id, status: decision, reviewedAt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async ownerDocument(workspaceId: string, submissionId: string, documentId: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      await this.requireFirmAdmin(tx, workspaceId, actorId);
      const document = await tx.firmVerificationDocument.findFirst({ where: { id: documentId, submissionId,
        submission: { workspaceId } }, select: { id: true, storageKey: true, mediaType: true } });
      if (!document) throw new NotFoundException("Firm verification document not found.");
      return this.download(await this.storage.read(document.storageKey), document.id, document.mediaType);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async adminDocument(submissionId: string, documentId: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePlatformAdmin(tx, actorId, sessionId);
      const document = await tx.firmVerificationDocument.findFirst({ where: { id: documentId, submissionId },
        select: { id: true, storageKey: true, mediaType: true } });
      if (!document) throw new NotFoundException("Firm verification document not found.");
      return this.download(await this.storage.read(document.storageKey), document.id, document.mediaType);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private async requireFirmAdmin(tx: Tx, workspaceId: string, actorId: string) {
    const membership = await tx.practiceMembership.findFirst({ where: { workspaceId, userId: actorId, role: "FIRM_ADMIN", status: "ACTIVE",
      workspace: { is: { kind: WorkspaceKind.FIRM, status: "ACTIVE" } } }, select: { id: true } });
    if (!membership) throw new ForbiddenException("An active Firm Admin membership is required.");
    return membership;
  }

  private async requirePlatformAdmin(tx: Tx, actorId: string, sessionId: string) {
    await this.lockSession(tx, actorId, sessionId);
    const grants = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM platform_role_grants
      WHERE user_id = ${actorId}::uuid AND role = 'SUPER_ADMIN' AND revoked_at IS NULL FOR SHARE`;
    if (grants.length !== 1) throw new ForbiddenException("Permission denied.");
  }

  private async lockSession(tx: Tx, actorId: string, sessionId: string) {
    const sessions = await tx.$queryRaw<Array<{ id: string }>>`SELECT s.id FROM user_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ${sessionId}::uuid AND s.user_id = ${actorId}::uuid AND s.revoked_at IS NULL AND s.expires_at > NOW()
      AND u.status = 'ACTIVE' FOR SHARE OF s, u`;
    if (sessions.length !== 1) throw new UnauthorizedException("Authentication required.");
  }

  private async expireOverdue(tx: Tx, workspaceId?: string, submissionId?: string) {
    const now = new Date();
    const overdue = await tx.firmVerificationSubmission.findMany({ where: {
      ...(workspaceId ? { workspaceId } : {}), ...(submissionId ? { id: submissionId } : {}),
      status: FirmVerificationStatus.APPROVED, expiresAt: { lte: now },
    }, take: 500, select: { id: true, workspaceId: true } });
    for (const item of overdue) {
      const changed = await tx.firmVerificationSubmission.updateMany({ where: { id: item.id,
        status: FirmVerificationStatus.APPROVED, expiresAt: { lte: now } }, data: { status: FirmVerificationStatus.EXPIRED } });
      if (changed.count === 1) await tx.securityAuditEvent.create({ data: { actorUserId: null, workspaceId: item.workspaceId,
        eventType: "FIRM_VERIFICATION_EXPIRED", targetType: "FirmVerificationSubmission", targetId: item.id,
        requestId: createRequestId(undefined), metadata: { fromStatus: "APPROVED", toStatus: "EXPIRED", reason: "VALIDITY_PERIOD_ELAPSED" } } });
    }
  }

  private download(bytes: Buffer, id: string, mediaType: string) {
    const extension = mediaType === "application/pdf" ? "pdf" : mediaType === "image/png" ? "png" : "jpg";
    return { bytes, filename: `firm-verification-${id}.${extension}`, mediaType: "application/octet-stream" };
  }
}

function parseDetails(value: string) {
  try { return JSON.parse(value) as Record<string, string>; }
  catch { throw new Error("Firm verification details could not be read."); }
}

function isConcurrentConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === "P2002" || error.code === "P2034";
  if (!error || typeof error !== "object") return false;
  const candidate = error as { meta?: { code?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown } } } };
  return [candidate.meta?.code, candidate.meta?.driverAdapterError?.cause?.originalCode].some((code) => code === "40001" || code === "40P01");
}
