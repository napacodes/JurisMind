import {
  ConflictException, ForbiddenException, Inject, Injectable, NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { LawyerCredentialSubmissionStatus } from "../generated/prisma/enums";
import { AuthorizationContextService } from "../authorization/authorization-context.service";
import { AuthorizationService } from "../authorization/authorization.service";
import { Permission } from "../authorization/permissions";
import { PrismaService } from "../database/prisma.service";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "../auth/auth.types";
import { createRequestId } from "../auth/auth.service";
import { CredentialSubmissionInput } from "./lawyer-verification.dto";
import { ValidCredentialFile } from "./credential-document";
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
      const submissions = await tx.lawyerCredentialSubmission.findMany({
        where: { membershipId: membership.id, workspaceId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, cardHolderName: true, jurisdiction: true, cardIdentifierLast4: true, status: true,
          reviewReason: true, reviewedAt: true, createdAt: true, documents: { select: { id: true, mediaType: true, sizeBytes: true, createdAt: true } } },
      });
      return { currentStatus: submissions[0]?.status ?? "NOT_SUBMITTED", submissions };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async submit(workspaceId: string, actorId: string, sessionId: string, requestId: string,
    input: CredentialSubmissionInput, file: ValidCredentialFile, bytes: Buffer) {
    const cardIdentifierCiphertext = encryptCredentialIdentifier(input.cardIdentifier, this.environment.lawyerCredentialEncryptionKey);
    await this.storage.put(file.storageKey, bytes);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockSession(tx, actorId, sessionId);
        const membership = await this.requireLawyerMembership(tx, workspaceId, actorId, true);
        const latest = await tx.lawyerCredentialSubmission.findFirst({ where: { membershipId: membership.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { status: true } });
        if (latest?.status === LawyerCredentialSubmissionStatus.PENDING) throw new ConflictException("A credential submission is already pending review.");
        if (latest?.status === LawyerCredentialSubmissionStatus.APPROVED) throw new ConflictException("This lawyer profile is already approved.");

        const submission = await tx.lawyerCredentialSubmission.create({ data: {
          workspaceId, membershipId: membership.id, cardHolderName: input.cardHolderName, jurisdiction: input.jurisdiction,
          cardIdentifierCiphertext, cardIdentifierLast4: input.cardIdentifier.slice(-4),
        }, select: { id: true, status: true, createdAt: true, cardIdentifierLast4: true } });
        await tx.lawyerCredentialDocument.create({ data: {
          submissionId: submission.id, workspaceId, membershipId: membership.id, storageKey: file.storageKey,
          mediaType: file.mediaType, sizeBytes: file.sizeBytes, sha256: file.sha256,
        } });
        await tx.securityAuditEvent.create({ data: {
          actorUserId: actorId, workspaceId, eventType: "LAWYER_CREDENTIAL_SUBMITTED", targetType: "LawyerCredentialSubmission",
          targetId: submission.id, requestId: createRequestId(requestId), metadata: { status: submission.status, jurisdiction: input.jurisdiction },
        } });
        await tx.securityAuditEvent.create({ data: {
          actorUserId: actorId, workspaceId, eventType: "LAWYER_CREDENTIAL_DOCUMENT_UPLOADED", targetType: "LawyerCredentialSubmission",
          targetId: submission.id, requestId: createRequestId(requestId), metadata: { mediaType: file.mediaType, sizeBytes: file.sizeBytes },
        } });
        return submission;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      await this.storage.remove(file.storageKey);
      if (isUniqueConflict(error)) throw new ConflictException("A credential submission conflicts with the current profile state.");
      throw error;
    }
  }

  async pending(actorId: string, sessionId: string, page: number, pageSize: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.requirePlatformAdmin(tx, actorId, sessionId);
      const where = { status: LawyerCredentialSubmissionStatus.PENDING };
      const total = await tx.lawyerCredentialSubmission.count({ where });
      const submissions = await tx.lawyerCredentialSubmission.findMany({ where, orderBy: { createdAt: "asc" }, skip: (page - 1) * pageSize, take: pageSize,
          select: { id: true, workspaceId: true, cardHolderName: true, jurisdiction: true, cardIdentifierLast4: true,
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
        id: true, workspaceId: true, membershipId: true, cardHolderName: true, jurisdiction: true,
        cardIdentifierCiphertext: true, cardIdentifierLast4: true, status: true, reviewReason: true, reviewedAt: true, createdAt: true,
        membership: { select: { user: { select: { id: true, fullName: true, email: true } }, workspace: { select: { id: true, name: true, kind: true } } } },
        documents: { select: { id: true, mediaType: true, sizeBytes: true, createdAt: true } },
      } });
      if (!submission) throw new NotFoundException("Credential submission not found.");
      const { cardIdentifierCiphertext, ...safeSubmission } = submission;
      return { ...safeSubmission, cardIdentifier: decryptCredentialIdentifier(cardIdentifierCiphertext, this.environment.lawyerCredentialEncryptionKey) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async review(submissionId: string, actorId: string, sessionId: string, requestId: string,
    decision: "APPROVED" | "REJECTED", reason: string | null) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.requirePlatformAdmin(tx, actorId, sessionId);
        await tx.$queryRaw`SELECT id FROM lawyer_credential_submissions WHERE id = ${submissionId}::uuid FOR UPDATE`;
        const submission = await tx.lawyerCredentialSubmission.findUnique({ where: { id: submissionId },
          select: { id: true, workspaceId: true, membershipId: true, status: true } });
        if (!submission) throw new NotFoundException("Credential submission not found.");
        if (submission.status !== LawyerCredentialSubmissionStatus.PENDING) throw new ConflictException("This submission has already been reviewed.");
        const reviewedAt = new Date();
        const changed = await tx.lawyerCredentialSubmission.updateMany({ where: { id: submissionId, status: "PENDING" },
          data: { status: decision, reviewReason: decision === "REJECTED" ? reason : null, reviewedById: actorId, reviewedAt } });
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
