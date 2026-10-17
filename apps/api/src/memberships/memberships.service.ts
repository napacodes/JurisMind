import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { MembershipRole, MembershipStatus, WorkspaceKind } from "../generated/prisma/enums";
import { Prisma, type PrismaClient } from "../generated/prisma/client";
import { AuthorizationContextService } from "../authorization/authorization-context.service";
import { AuthorizationService } from "../authorization/authorization.service";
import { Permission } from "../authorization/permissions";
import { PrismaService } from "../database/prisma.service";
import type { AuthorizationContext } from "../authorization/authorization.types";

type Transaction = Prisma.TransactionClient;

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthorizationContextService) private readonly contexts: AuthorizationContextService,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
  ) {}

  async list(workspaceId: string, actorId: string, sessionId: string) {
    return this.read(actorId, sessionId, workspaceId, Permission.ReadWorkspaceMemberships, async (tx) => tx.practiceMembership.findMany({
      where: { workspaceId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, role: true, status: true, joinedAt: true, supervisingLawyerMembershipId: true,
        user: { select: { id: true, email: true, fullName: true, status: true } },
        supervisor: { select: { id: true, user: { select: { id: true, email: true, fullName: true } } } },
        lawyerProfile: { select: { isPrimary: true, displayTitle: true, jurisdiction: true } },
      },
    }));
  }

  async changeRole(workspaceId: string, membershipId: string, actorId: string, sessionId: string,
    role: MembershipRole, requestId: string) {
    return this.mutate(actorId, sessionId, workspaceId, Permission.ManageWorkspaceMemberships, requestId, async (tx) => {
      const target = await this.lockMembership(tx, workspaceId, membershipId);
      if (!target) throw new NotFoundException("Membership not found.");
      if (target.userId === actorId) throw new ForbiddenException("You cannot change your own practice role.");
      if (target.status === MembershipStatus.INVITED && await tx.workspaceInvitation.findFirst({
        where: { membershipId, status: "PENDING" }, select: { id: true },
      })) throw new ConflictException("Replace the pending invitation to change its role.");
      const workspace = await tx.practiceWorkspace.findUnique({ where: { id: workspaceId }, select: { kind: true } });
      if (workspace?.kind === WorkspaceKind.INDIVIDUAL && role !== MembershipRole.ASSISTANT) {
        throw new BadRequestException("Only assistants can be added or role-managed in an individual-practice workspace.");
      }
      if (workspace?.kind === WorkspaceKind.INDIVIDUAL && target.role === MembershipRole.LAWYER) {
        throw new ConflictException("The primary lawyer role cannot be changed by this workflow.");
      }
      if (target.role === role) return target;
      if (role === MembershipRole.ASSISTANT && target.status === MembershipStatus.ACTIVE) {
        throw new ConflictException("Suspend the member before changing their role to Assistant.");
      }
      if (target.role === MembershipRole.ASSISTANT && target.status === MembershipStatus.ACTIVE) {
        throw new ConflictException("Suspend the assistant before changing their practice role.");
      }
      const updated = await tx.practiceMembership.update({
        where: { id: membershipId }, data: {
          role,
          ...(target.role === MembershipRole.ASSISTANT ? { supervisingLawyerMembershipId: null } : {}),
        },
        select: { id: true, workspaceId: true, role: true, status: true, userId: true },
      });
      await this.audit(tx, actorId, workspaceId, "WORKSPACE_MEMBERSHIP_ROLE_CHANGED", "PracticeMembership", membershipId, requestId,
        { fromRole: target.role, toRole: role });
      return updated;
    });
  }

  async suspend(workspaceId: string, membershipId: string, actorId: string, sessionId: string, requestId: string) {
    return this.mutate(actorId, sessionId, workspaceId, Permission.ManageWorkspaceMemberships, requestId, async (tx) => {
      const target = await this.lockMembership(tx, workspaceId, membershipId);
      if (!target) throw new NotFoundException("Membership not found.");
      if (target.userId === actorId) throw new ForbiddenException("You cannot suspend your own membership.");
      if (target.status === MembershipStatus.SUSPENDED) return { id: target.id, status: target.status };
      if (target.status === MembershipStatus.REVOKED) throw new ConflictException("A revoked membership cannot be suspended.");
      const updated = await tx.practiceMembership.update({
        where: { id: membershipId }, data: {
          status: MembershipStatus.SUSPENDED,
          ...(target.role === MembershipRole.ASSISTANT ? { supervisingLawyerMembershipId: null } : {}),
        },
        select: { id: true, status: true },
      });
      if (target.status === MembershipStatus.INVITED) {
        const pending = await tx.workspaceInvitation.findMany({ where: { membershipId, status: "PENDING" }, select: { id: true } });
        if (pending.length) {
          await tx.workspaceInvitation.updateMany({ where: { membershipId, status: "PENDING" },
            data: { status: "REVOKED", revokedAt: new Date() } });
          await this.audit(tx, actorId, workspaceId, "WORKSPACE_INVITATION_REVOKED", "WorkspaceInvitation",
            pending[0]!.id, requestId, { reason: "membership_suspended" });
        }
      }
      await this.audit(tx, actorId, workspaceId, "WORKSPACE_MEMBERSHIP_SUSPENDED", "PracticeMembership", membershipId, requestId,
        { previousStatus: target.status, previousSupervisorMembershipId: target.supervisingLawyerMembershipId });
      return updated;
    });
  }

  async reinstate(workspaceId: string, membershipId: string, actorId: string, sessionId: string, requestId: string) {
    return this.mutate(actorId, sessionId, workspaceId, Permission.ManageWorkspaceMemberships, requestId, async (tx) => {
      const target = await this.lockMembership(tx, workspaceId, membershipId);
      if (!target) throw new NotFoundException("Membership not found.");
      if (target.userId === actorId) throw new ForbiddenException("You cannot reinstate your own membership.");
      if (target.status === MembershipStatus.ACTIVE) return { id: target.id, status: target.status };
      if (target.status === MembershipStatus.REVOKED) throw new ConflictException("A revoked membership cannot be reinstated.");
      if (target.role === MembershipRole.ASSISTANT) {
        throw new ConflictException("Reinstate an assistant through the supervisor assignment workflow.");
      }
      const updated = await tx.practiceMembership.update({
        where: { id: membershipId }, data: { status: MembershipStatus.ACTIVE, joinedAt: new Date() },
        select: { id: true, status: true },
      });
      await this.audit(tx, actorId, workspaceId, "WORKSPACE_MEMBERSHIP_REINSTATED", "PracticeMembership", membershipId, requestId,
        { role: target.role });
      return updated;
    });
  }

  async assistantsForLawyer(workspaceId: string, lawyerMembershipId: string, actorId: string, sessionId: string) {
    return this.read(actorId, sessionId, workspaceId, Permission.ManageAssistantAssignments, async (tx, context) => {
    const actorMembership = context.memberships.find((item) => item.workspaceId === workspaceId)!;
    const lawyer = await tx.practiceMembership.findFirst({
      where: { id: lawyerMembershipId, workspaceId, role: MembershipRole.LAWYER, status: MembershipStatus.ACTIVE,
        lawyerProfile: { isNot: null } },
      select: { id: true },
    });
    if (!lawyer) throw new NotFoundException("Active lawyer not found.");
    if (actorMembership.role === MembershipRole.LAWYER && lawyerMembershipId !== await this.getActorMembershipId(workspaceId, actorId, tx)) {
      throw new ForbiddenException("Lawyers may list only assistants supervised by themselves.");
    }
    return tx.practiceMembership.findMany({
      where: { workspaceId, role: MembershipRole.ASSISTANT, supervisingLawyerMembershipId: lawyerMembershipId },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, status: true, joinedAt: true, user: { select: { id: true, email: true, fullName: true, status: true } } },
    });
    });
  }

  async assignAssistant(workspaceId: string, assistantMembershipId: string, actorId: string,
    sessionId: string, supervisorMembershipId: string, requestId: string) {
    return this.mutate(actorId, sessionId, workspaceId, Permission.ManageAssistantAssignments, requestId, async (tx, actor) => {
      const assistant = await this.lockMembership(tx, workspaceId, assistantMembershipId);
      if (!assistant || assistant.role !== MembershipRole.ASSISTANT) throw new NotFoundException("Assistant membership not found.");
      if (assistant.userId === actorId) throw new ForbiddenException("Assistants cannot assign or reassign themselves.");
      const actorMembership = actor.memberships.find((item) => item.workspaceId === workspaceId)!;
      const actorMembershipId = await this.getActorMembershipId(workspaceId, actorId, tx);
      if (actorMembership.role === MembershipRole.LAWYER) {
        if (assistant.supervisingLawyerMembershipId && assistant.supervisingLawyerMembershipId !== actorMembershipId) {
          throw new ForbiddenException("A lawyer may change only an assistant currently supervised by them.");
        }
        if (!assistant.supervisingLawyerMembershipId && supervisorMembershipId !== actorMembershipId) {
          throw new ForbiddenException("A lawyer may assign an unassigned assistant only to themselves.");
        }
      }
      const supervisor = await tx.practiceMembership.findFirst({
        where: { id: supervisorMembershipId, workspaceId, role: MembershipRole.LAWYER, status: MembershipStatus.ACTIVE,
          lawyerProfile: { isNot: null } },
        select: { id: true },
      });
      if (!supervisor) throw new BadRequestException("Supervisor must be an active lawyer with a profile in this workspace.");
      if (assistant.status === MembershipStatus.REVOKED) throw new ConflictException("A revoked assistant membership cannot be activated.");
      const updated = await tx.practiceMembership.update({
        where: { id: assistantMembershipId },
        data: { supervisingLawyerMembershipId: supervisorMembershipId,
          status: assistant.status === MembershipStatus.INVITED ? MembershipStatus.INVITED : MembershipStatus.ACTIVE,
          joinedAt: assistant.status === MembershipStatus.INVITED ? null : assistant.joinedAt ?? new Date() },
        select: { id: true, workspaceId: true, role: true, status: true, supervisingLawyerMembershipId: true },
      });
      await this.audit(tx, actorId, workspaceId,
        assistant.supervisingLawyerMembershipId ? "ASSISTANT_SUPERVISOR_REASSIGNED" : "ASSISTANT_SUPERVISOR_ASSIGNED",
        "PracticeMembership", assistantMembershipId, requestId,
        { previousSupervisorMembershipId: assistant.supervisingLawyerMembershipId, supervisorMembershipId });
      return updated;
    });
  }

  private async read<T>(actorId: string, sessionId: string, workspaceId: string, permission: string,
    operation: (tx: Transaction, actor: AuthorizationContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockVerifiedSession(tx, actorId, sessionId);
      await tx.$queryRaw`SELECT id FROM practice_memberships WHERE workspace_id = ${workspaceId}::uuid AND user_id = ${actorId}::uuid FOR SHARE`;
      const actor = await this.requirePermission(actorId, workspaceId, permission, tx);
      return operation(tx, actor);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async mutate<T>(actorId: string, sessionId: string, workspaceId: string, permission: string, requestId: string,
    operation: (tx: Transaction, actor: AuthorizationContext) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Hold a shared lock through commit so logout/revocation has a clear order
        // relative to this authorized mutation. Revocation first means no write.
        await this.lockVerifiedSession(tx, actorId, sessionId);
        // Lock the actor's membership so concurrent role changes cannot race an authorized write.
        await tx.$queryRaw`SELECT id FROM practice_memberships WHERE workspace_id = ${workspaceId}::uuid AND user_id = ${actorId}::uuid FOR UPDATE`;
        const actor = await this.requirePermission(actorId, workspaceId, permission, tx);
        return operation(tx, actor);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const candidate = typeof error === "object" && error !== null ? error as {
        code?: unknown; meta?: { code?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown } } };
      } : undefined;
      const code = typeof candidate?.code === "string" ? candidate.code : undefined;
      const sqlState = typeof candidate?.meta?.code === "string" ? candidate.meta.code : undefined;
      const adapterCode = typeof candidate?.meta?.driverAdapterError?.cause?.originalCode === "string"
        ? candidate.meta.driverAdapterError.cause.originalCode : undefined;
      if ((code !== undefined && ["P2002", "P2003", "P2004", "P2034"].includes(code))
        || (sqlState !== undefined && ["23503", "23505", "23514", "40001", "P0001"].includes(sqlState))) {
        throw new ConflictException("The membership change conflicts with current workspace state.");
      }
      if (adapterCode !== undefined && ["23503", "23505", "23514", "40001", "P0001"].includes(adapterCode)) {
        throw new ConflictException("The membership change conflicts with current workspace state.");
      }
      throw error;
    }
  }

  private async lockVerifiedSession(tx: Transaction, actorId: string, sessionId: string): Promise<void> {
    const now = new Date();
    const sessions = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT authenticated_session.id
      FROM user_sessions AS authenticated_session
      JOIN users AS authenticated_user ON authenticated_user.id = authenticated_session.user_id
      WHERE authenticated_session.id = ${sessionId}::uuid
        AND authenticated_session.user_id = ${actorId}::uuid
        AND authenticated_session.revoked_at IS NULL
        AND authenticated_session.expires_at > ${now}
        AND authenticated_user.status = 'ACTIVE'
      FOR SHARE OF authenticated_session, authenticated_user
    `;
    if (sessions.length !== 1) throw new UnauthorizedException("Authentication required.");
  }

  private async requirePermission(actorId: string, workspaceId: string, permission: string,
    client: Pick<PrismaClient, "user"> = this.prisma): Promise<AuthorizationContext> {
    const context = await this.contexts.resolveForUser(actorId, client);
    if (!context || !this.authorization.hasPermission(context, permission, workspaceId)) {
      throw new ForbiddenException("Permission denied.");
    }
    return context;
  }

  private async lockMembership(tx: Transaction, workspaceId: string, membershipId: string) {
    await tx.$queryRaw`SELECT id FROM practice_memberships WHERE id = ${membershipId}::uuid AND workspace_id = ${workspaceId}::uuid FOR UPDATE`;
    return tx.practiceMembership.findFirst({ where: { id: membershipId, workspaceId },
      select: { id: true, workspaceId: true, userId: true, role: true, status: true, joinedAt: true,
        supervisingLawyerMembershipId: true } });
  }

  private async getActorMembershipId(workspaceId: string, actorId: string, tx?: Transaction): Promise<string> {
    const client: Pick<PrismaClient, "practiceMembership"> = tx ?? this.prisma;
    const membership = await client.practiceMembership.findFirst({ where: { workspaceId, userId: actorId,
      status: MembershipStatus.ACTIVE }, select: { id: true } });
    if (!membership) throw new ForbiddenException("Permission denied.");
    return membership.id;
  }

  private async audit(tx: Transaction, actorUserId: string, workspaceId: string, eventType: string,
    targetType: string, targetId: string, requestId: string, metadata: Prisma.InputJsonObject): Promise<void> {
    await tx.securityAuditEvent.create({ data: { actorUserId, workspaceId, eventType, targetType, targetId, requestId, metadata } });
  }
}
