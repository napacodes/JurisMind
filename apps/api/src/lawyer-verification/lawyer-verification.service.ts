import {
  BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { LawyerCredentialSubmissionStatus } from "../generated/prisma/enums";
import { lawyerCredentialDocumentRequiredFor } from "../config/env.validation";
import { AuthorizationContextService } from "../authorization/authorization-context.service";
import { AuthorizationService } from "../authorization/authorization.service";
import { Permission } from "../authorization/permissions";
import { PrismaService } from "../database/prisma.service";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "../auth/auth.types";
import { createRequestId } from "../auth/auth.service";
import { CredentialSubmissionInput } from "./lawyer-verification.dto";
import { scopeCredentialStorageKey, ValidCredentialFile } from "./credential-document";
import { decryptCredentialIdentifier, encryptCredentialIdentifier } from "./lawyer-credential-crypto";
import { PrivateDocumentStorage } from "./private-document-storage";

type Tx = Prisma.TransactionClient;

@Injectable()
export class LawyerVerificationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthorizationContextService) private readonly contexts: AuthorizationContextService,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
    @Inject(PrivateDocumentStorage) private readonly storage: PrivateDocumentStorage,
  ) {}

  async mine(workspaceId: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      const membership = await this.requireLawyerMembership(tx, workspaceId, actorId, false);
      await this.expireOverdue(tx, { membershipId: membership.id });
      const submissions = await tx.lawyerCredentialSubmission.findMany({
        where: { membershipId: membership.id, workspaceId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, cardHolderName: true, professionalRegulator: true, jurisdiction: true, cardIdentifierLast4: true, status: true,
          reviewReason: true, reviewedAt: true, expiresAt: true, createdAt: true, documents: { select: { id: true, mediaType: true, sizeBytes: true, createdAt: true } } },
      });
      return { currentStatus: submissions[0]?.status ?? "NOT_SUBMITTED", submissions };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async documentPolicy(workspaceId: string, actorId: string, sessionId: string, jurisdiction: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      await this.requireLawyerMembership(tx, workspaceId, actorId, false);
      return { required: lawyerCredentialDocumentRequiredFor(this.environment.lawyerCredentialDocumentPolicy, jurisdiction) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async submit(workspaceId: string, actorId: string, sessionId: string, requestId: string,
    input: CredentialSubmissionInput, file: ValidCredentialFile | undefined, bytes: Buffer | undefined) {
    const documentRequired = lawyerCredentialDocumentRequiredFor(this.environment.lawyerCredentialDocumentPolicy, input.jurisdiction);
    if (documentRequired && (!file || !bytes)) throw new BadRequestException("A supporting credential document is required for this jurisdiction.");
    const cardIdentifierCiphertext = encryptCredentialIdentifier(input.cardIdentifier, this.environment.lawyerCredentialEncryptionKey);
    const storageKey = file ? scopeCredentialStorageKey(workspaceId, file.storageKey) : undefined;
    if (storageKey && bytes) await this.storage.put(storageKey, bytes);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockSession(tx, actorId, sessionId);
        const membership = await this.requireLawyerMembership(tx, workspaceId, actorId, true);
        await this.expireOverdue(tx, { membershipId: membership.id });
        const latest = await tx.lawyerCredentialSubmission.findFirst({ where: { membershipId: membership.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, status: true } });
        if (latest?.status === LawyerCredentialSubmissionStatus.PENDING) throw new ConflictException("A credential submission is already pending review.");
        if (latest?.status === LawyerCredentialSubmissionStatus.APPROVED) throw new ConflictException("This lawyer profile is already approved.");

        const submission = latest?.status === LawyerCredentialSubmissionStatus.DRAFT
          ? await tx.lawyerCredentialSubmission.update({ where: { id: latest.id }, data: {
            status: LawyerCredentialSubmissionStatus.PENDING, cardHolderName: input.cardHolderName, jurisdiction: input.jurisdiction,
            professionalRegulator: input.professionalRegulator, cardIdentifierCiphertext, cardIdentifierLast4: input.cardIdentifier.slice(-4),
          }, select: { id: true, status: true, createdAt: true, cardIdentifierLast4: true } })
          : await tx.lawyerCredentialSubmission.create({ data: {
            workspaceId, membershipId: membership.id, cardHolderName: input.cardHolderName, jurisdiction: input.jurisdiction,
            professionalRegulator: input.professionalRegulator, cardIdentifierCiphertext, cardIdentifierLast4: input.cardIdentifier.slice(-4),
          }, select: { id: true, status: true, createdAt: true, cardIdentifierLast4: true } });
        if (file && storageKey) await tx.lawyerCredentialDocument.create({ data: {
          submissionId: submission.id, workspaceId, membershipId: membership.id, storageKey,
          mediaType: file.mediaType, sizeBytes: file.sizeBytes, sha256: file.sha256,
        } });
        await tx.securityAuditEvent.create({ data: {
          actorUserId: actorId, workspaceId, eventType: "LAWYER_CREDENTIAL_SUBMITTED", targetType: "LawyerCredentialSubmission",
          targetId: submission.id, requestId: createRequestId(requestId), metadata: { status: submission.status, jurisdiction: input.jurisdiction },
        } });
        if (file) await tx.securityAuditEvent.create({ data: {
          actorUserId: actorId, workspaceId, eventType: "LAWYER_CREDENTIAL_DOCUMENT_UPLOADED", targetType: "LawyerCredentialSubmission",
          targetId: submission.id, requestId: createRequestId(requestId), metadata: { mediaType: file.mediaType, sizeBytes: file.sizeBytes },
        } });
        return submission;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (storageKey) await this.storage.remove(storageKey);
      if (isUniqueConflict(error)) throw new ConflictException("A credential submission conflicts with the current profile state.");
      throw error;
    }
  }

  async saveDraft(workspaceId: string, actorId: string, sessionId: string, requestId: string,
    input: Partial<CredentialSubmissionInput>) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      const membership = await this.requireLawyerMembership(tx, workspaceId, actorId, true);
      await this.expireOverdue(tx, { membershipId: membership.id });
      const latest = await tx.lawyerCredentialSubmission.findFirst({ where: { membershipId: membership.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, status: true } });
      if (latest?.status === LawyerCredentialSubmissionStatus.PENDING || latest?.status === LawyerCredentialSubmissionStatus.APPROVED) {
        throw new ConflictException("A pending or approved credential submission cannot be edited.");
      }
      const cardIdentifier = input.cardIdentifier ?? "";
      const fields = { cardHolderName: input.cardHolderName ?? "", professionalRegulator: input.professionalRegulator ?? "",
        jurisdiction: input.jurisdiction ?? "", cardIdentifierCiphertext: encryptCredentialIdentifier(cardIdentifier, this.environment.lawyerCredentialEncryptionKey),
        cardIdentifierLast4: cardIdentifier.slice(-4).padStart(4, " ") };
      const draft = latest?.status === LawyerCredentialSubmissionStatus.DRAFT
        ? await tx.lawyerCredentialSubmission.update({ where: { id: latest.id }, data: fields,
          select: { id: true, status: true, createdAt: true } })
        : await tx.lawyerCredentialSubmission.create({ data: { workspaceId, membershipId: membership.id,
          ...fields, status: LawyerCredentialSubmissionStatus.DRAFT }, select: { id: true, status: true, createdAt: true } });
      await tx.securityAuditEvent.create({ data: { actorUserId: actorId, workspaceId, eventType: "LAWYER_CREDENTIAL_DRAFT_SAVED",
        targetType: "LawyerCredentialSubmission", targetId: draft.id, requestId: createRequestId(requestId),
        metadata: { status: draft.status, fieldCount: Object.keys(input).length } } });
      return draft;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async pending(actorId: string, sessionId: string, page: number, pageSize: number, status: "PENDING" | "ALL" = "PENDING") {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePlatformAdmin(tx, actorId, sessionId);
      await this.expireOverdue(tx);
      const where = status === "ALL" ? { status: { not: LawyerCredentialSubmissionStatus.DRAFT } } : { status: LawyerCredentialSubmissionStatus.PENDING };
      const total = await tx.lawyerCredentialSubmission.count({ where });
      const submissions = await tx.lawyerCredentialSubmission.findMany({ where, orderBy: { createdAt: "asc" }, skip: (page - 1) * pageSize, take: pageSize,
          select: { id: true, workspaceId: true, cardHolderName: true, professionalRegulator: true, jurisdiction: true, cardIdentifierLast4: true,
            status: true, reviewReason: true, reviewedAt: true, expiresAt: true,
            createdAt: true, membership: { select: { user: { select: { id: true, fullName: true, email: true } }, workspace: { select: { id: true, name: true, kind: true } } }, },
            documents: { select: { id: true, mediaType: true, sizeBytes: true } } },
        });
      return { submissions, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async adminDetail(submissionId: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePlatformAdmin(tx, actorId, sessionId);
      const submission = await tx.lawyerCredentialSubmission.findUnique({ where: { id: submissionId }, select: {
        id: true, workspaceId: true, membershipId: true, cardHolderName: true, professionalRegulator: true, jurisdiction: true,
        cardIdentifierCiphertext: true, cardIdentifierLast4: true, status: true, reviewReason: true, reviewedAt: true, expiresAt: true, createdAt: true,
        membership: { select: { user: { select: { id: true, fullName: true, email: true } }, workspace: { select: { id: true, name: true, kind: true } } } },
        documents: { select: { id: true, mediaType: true, sizeBytes: true, createdAt: true } },
      } });
      if (!submission) throw new NotFoundException("Credential submission not found.");
      if (submission.status === LawyerCredentialSubmissionStatus.DRAFT) throw new NotFoundException("Credential submission not found.");
      await this.expireOverdue(tx, { id: submissionId });
      const refreshedSubmission = submission.status === LawyerCredentialSubmissionStatus.APPROVED && submission.expiresAt && submission.expiresAt <= new Date()
        ? { ...submission, status: LawyerCredentialSubmissionStatus.EXPIRED } : submission;
      const { cardIdentifierCiphertext, ...safeSubmission } = refreshedSubmission;
      return { ...safeSubmission, cardIdentifier: decryptCredentialIdentifier(cardIdentifierCiphertext, this.environment.lawyerCredentialEncryptionKey) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async review(submissionId: string, actorId: string, sessionId: string, requestId: string,
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED", reason: string | null) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.requirePlatformAdmin(tx, actorId, sessionId);
        await tx.$queryRaw`SELECT id FROM lawyer_credential_submissions WHERE id = ${submissionId}::uuid FOR UPDATE`;
        const submission = await tx.lawyerCredentialSubmission.findUnique({ where: { id: submissionId },
          select: { id: true, workspaceId: true, membershipId: true, status: true,
            membership: { select: { userId: true } } } });
        if (!submission) throw new NotFoundException("Credential submission not found.");
        if (submission.membership.userId === actorId) throw new ForbiddenException("You cannot review your own credential submission.");
        if (submission.status !== LawyerCredentialSubmissionStatus.PENDING) throw new ConflictException("This submission has already been reviewed.");
        const reviewedAt = new Date();
        const changed = await tx.lawyerCredentialSubmission.updateMany({ where: { id: submissionId, status: "PENDING" },
          data: { status: decision, reviewReason: decision === "APPROVED" ? null : reason, reviewedById: actorId, reviewedAt,
            expiresAt: decision === "APPROVED" && this.environment.lawyerCredentialValidityDays
              ? new Date(reviewedAt.getTime() + this.environment.lawyerCredentialValidityDays * 86_400_000) : null } });
        if (changed.count !== 1) throw new ConflictException("This submission changed during review.");
        await tx.securityAuditEvent.create({ data: {
          actorUserId: actorId, workspaceId: submission.workspaceId, eventType: "LAWYER_CREDENTIAL_REVIEWED",
          targetType: "LawyerCredentialSubmission", targetId: submission.id, requestId: createRequestId(requestId),
          metadata: { fromStatus: "PENDING", toStatus: decision, reasonProvided: decision === "REJECTED" && Boolean(reason) },
        } });
        return { id: submission.id, status: decision, reviewedAt };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (isConcurrentTransactionConflict(error)) {
        throw new ConflictException("This submission changed during review.");
      }
      throw error;
    }
  }

  async ownerDocument(workspaceId: string, submissionId: string, documentId: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      await this.requireLawyerMembership(tx, workspaceId, actorId, false);
      const document = await tx.lawyerCredentialDocument.findFirst({ where: { id: documentId, submissionId, workspaceId },
        select: { id: true, storageKey: true, mediaType: true, submission: { select: { membership: { select: { userId: true } } } } } });
      if (!document || document.submission.membership.userId !== actorId) throw new NotFoundException("Credential document not found.");
      const bytes = await this.storage.read(document.storageKey);
      return this.download(bytes, document.id, document.mediaType);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async adminDocument(submissionId: string, documentId: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePlatformAdmin(tx, actorId, sessionId);
      const document = await tx.lawyerCredentialDocument.findFirst({ where: { id: documentId, submissionId },
        select: { id: true, storageKey: true, mediaType: true } });
      if (!document) throw new NotFoundException("Credential document not found.");
      const bytes = await this.storage.read(document.storageKey);
      return this.download(bytes, document.id, document.mediaType);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private async requireLawyerMembership(tx: Tx, workspaceId: string, actorId: string, forUpdate: boolean) {
    if (forUpdate) await tx.$queryRaw`SELECT id FROM practice_memberships WHERE workspace_id = ${workspaceId}::uuid AND user_id = ${actorId}::uuid FOR UPDATE`;
    const membership = await tx.practiceMembership.findFirst({ where: { workspaceId, userId: actorId, role: "LAWYER", status: "ACTIVE",
      workspace: { is: { status: "ACTIVE" } }, lawyerProfile: { isNot: null } }, select: { id: true } });
    if (!membership) throw new ForbiddenException("Permission denied.");
    const context = await this.contexts.resolveForUser(actorId, tx);
    if (!context || !this.authorization.hasPermission(context, Permission.SubmitLawyerCredentialVerification, workspaceId)) {
      throw new ForbiddenException("Permission denied.");
    }
    return membership;
  }

  private async requirePlatformAdmin(tx: Tx, actorId: string, sessionId: string): Promise<void> {
    await this.lockSession(tx, actorId, sessionId);
    await tx.$queryRaw`SELECT id FROM platform_role_grants WHERE user_id = ${actorId}::uuid AND role = 'SUPER_ADMIN' AND revoked_at IS NULL FOR SHARE`;
    const context = await this.contexts.resolveForUser(actorId, tx);
    if (!context || !this.authorization.hasPermission(context, Permission.PlatformAdministration)) throw new ForbiddenException("Permission denied.");
  }

  private async lockSession(tx: Tx, actorId: string, sessionId: string): Promise<void> {
    const sessions = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT s.id FROM user_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ${sessionId}::uuid AND s.user_id = ${actorId}::uuid AND s.revoked_at IS NULL
        AND s.expires_at > NOW() AND u.status = 'ACTIVE' FOR SHARE OF s, u`;
    if (sessions.length !== 1) throw new UnauthorizedException("Authentication required.");
  }

  private async expireOverdue(tx: Tx, scope: { id?: string; membershipId?: string } = {}) {
    const now = new Date();
    const overdue = await tx.lawyerCredentialSubmission.findMany({ where: {
      ...scope, status: LawyerCredentialSubmissionStatus.APPROVED, expiresAt: { lte: now },
    }, take: 500, select: { id: true, workspaceId: true } });
    for (const item of overdue) {
      const changed = await tx.lawyerCredentialSubmission.updateMany({ where: { id: item.id,
        status: LawyerCredentialSubmissionStatus.APPROVED, expiresAt: { lte: now } }, data: { status: LawyerCredentialSubmissionStatus.EXPIRED } });
      if (changed.count === 1) await tx.securityAuditEvent.create({ data: { actorUserId: null, workspaceId: item.workspaceId,
        eventType: "LAWYER_CREDENTIAL_EXPIRED", targetType: "LawyerCredentialSubmission", targetId: item.id,
        requestId: createRequestId(undefined), metadata: { fromStatus: "APPROVED", toStatus: "EXPIRED", reason: "VALIDITY_PERIOD_ELAPSED" } } });
    }
  }

  private download(bytes: Buffer, id: string, mediaType: string) {
    const extension = mediaType === "application/pdf" ? "pdf" : mediaType === "image/png" ? "png" : "jpg";
    return { bytes, filename: `credential-${id}.${extension}`, mediaType: "application/octet-stream" };
  }
}

function isUniqueConflict(error: unknown): boolean {
  return (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034"))
    || isConcurrentTransactionConflict(error);
}

function isConcurrentTransactionConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return true;
  if (!error || typeof error !== "object") return false;
  const candidate = error as { meta?: { code?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown } } } };
  const codes = [candidate.meta?.code, candidate.meta?.driverAdapterError?.cause?.originalCode];
  return codes.some((code) => code === "40001" || code === "40P01");
}
