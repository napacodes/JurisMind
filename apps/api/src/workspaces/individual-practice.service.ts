import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { MembershipRole, MembershipStatus, WorkspaceKind } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";

type Transaction = Prisma.TransactionClient;

@Injectable()
export class IndividualPracticeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async provision(actorId: string, sessionId: string, name: string, idempotencyKey: string, requestId: string) {
    const nameFingerprint = createHash("sha256").update(name).digest("hex");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sessions = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT s.id FROM user_sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = ${sessionId}::uuid AND s.user_id = ${actorId}::uuid
            AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'ACTIVE'
          FOR SHARE OF s, u
        `;
        if (sessions.length !== 1) throw new UnauthorizedException("Authentication required.");

        // Serialize only requests with the same user and key; unrelated practice creations remain independent.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actorId}:${idempotencyKey}`}, 0)) IS NULL AS locked`;
        const prior = await tx.securityAuditEvent.findFirst({
          where: { actorUserId: actorId, eventType: "INDIVIDUAL_PRACTICE_PROVISIONED", requestId: idempotencyKey },
          select: { targetId: true, metadata: true },
        });
        if (prior) {
          const previousFingerprint = typeof prior.metadata === "object" && prior.metadata !== null
            && !Array.isArray(prior.metadata) && "nameFingerprint" in prior.metadata
            ? prior.metadata.nameFingerprint : undefined;
          if (previousFingerprint !== nameFingerprint || !prior.targetId) {
            throw new ConflictException("This Idempotency-Key was already used for a different request.");
          }
          return this.safeResult(tx, prior.targetId, actorId);
        }

        const workspaceId = randomUUID();
        const membershipId = randomUUID();
        const workspace = await tx.practiceWorkspace.create({ data: {
          id: workspaceId,
          name,
          slug: `individual-${randomUUID()}`,
          kind: WorkspaceKind.INDIVIDUAL,
        }, select: { id: true, name: true, slug: true, kind: true, status: true, createdAt: true } });
        const membership = await tx.practiceMembership.create({ data: {
          id: membershipId,
          workspaceId,
          userId: actorId,
          role: MembershipRole.LAWYER,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
        }, select: { id: true, role: true, status: true, joinedAt: true } });
        const profile = await tx.lawyerProfile.create({ data: {
          workspaceId,
          membershipId,
          isPrimary: true,
        }, select: { id: true, isPrimary: true } });
        await tx.securityAuditEvent.create({ data: {
          actorUserId: actorId,
          workspaceId,
          eventType: "INDIVIDUAL_PRACTICE_PROVISIONED",
          targetType: "PracticeWorkspace",
          targetId: workspaceId,
          requestId: idempotencyKey,
          metadata: { nameFingerprint, requestId },
        } });
        return { workspace, membership, lawyerProfile: profile };
      // Read committed is deliberate: after waiting on the advisory lock, a
      // replay must see the preceding transaction's committed audit record.
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof UnauthorizedException) throw error;
      const candidate = typeof error === "object" && error !== null ? error as {
        code?: unknown; meta?: { code?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown } } };
      } : undefined;
      const codes = [candidate?.code, candidate?.meta?.code, candidate?.meta?.driverAdapterError?.cause?.originalCode];
      if (codes.some((code) => typeof code === "string" && ["P2002", "P2003", "P2004", "P2034", "23503", "23505", "23514", "40001", "P0001"].includes(code))) {
        throw new ConflictException("Individual practice could not be provisioned with the current account or workspace state.");
      }
      throw error;
    }
  }

  private async safeResult(tx: Transaction, workspaceId: string, actorId: string) {
    const workspace = await tx.practiceWorkspace.findUnique({ where: { id: workspaceId },
      select: { id: true, name: true, slug: true, kind: true, status: true, createdAt: true } });
    const membership = await tx.practiceMembership.findFirst({ where: { workspaceId, userId: actorId,
      role: MembershipRole.LAWYER, status: MembershipStatus.ACTIVE },
      select: { id: true, role: true, status: true, joinedAt: true, lawyerProfile: { select: { id: true, isPrimary: true } } } });
    if (!workspace || workspace.kind !== WorkspaceKind.INDIVIDUAL || !membership?.lawyerProfile?.isPrimary) {
      throw new ConflictException("The prior provisioning result is no longer available.");
    }
    const { lawyerProfile, ...safeMembership } = membership;
    return { workspace, membership: safeMembership, lawyerProfile };
  }
}
