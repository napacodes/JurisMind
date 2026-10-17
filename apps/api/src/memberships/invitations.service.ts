import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { InvitationStatus, MembershipRole, MembershipStatus, WorkspaceKind } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { AuthorizationContextService } from "../authorization/authorization-context.service";
import { AuthorizationService } from "../authorization/authorization.service";
import { Permission } from "../authorization/permissions";
import { PrismaService } from "../database/prisma.service";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "../auth/auth.types";
import type { AuthorizationContext } from "../authorization/authorization.types";
import { INVITATION_DELIVERY } from "./invitation-delivery";
import type { InvitationDelivery } from "./invitation-delivery";

type Transaction = Prisma.TransactionClient;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthorizationContextService) private readonly contexts: AuthorizationContextService,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
    @Inject(INVITATION_DELIVERY) private readonly deliveryProvider: InvitationDelivery,
  ) {}

  async create(workspaceId: string, actorId: string, sessionId: string,
    input: { userId: string; role: MembershipRole }, requestId: string) {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashInvitationToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const managementPermissions = input.role === MembershipRole.ASSISTANT
      ? [Permission.ManageWorkspaceMemberships, Permission.ManageAssistantAssignments]
      : [Permission.ManageWorkspaceMemberships];
    const result = await this.transact(actorId, sessionId, workspaceId, requestId, async (tx, context) => {
      const workspace = await tx.practiceWorkspace.findUnique({ where: { id: workspaceId }, select: { kind: true, status: true } });
      if (!workspace || workspace.status !== "ACTIVE") throw new NotFoundException("Workspace not found.");
      if (input.userId === actorId) throw new ConflictException("You cannot invite yourself.");
      const actorMembership = context.memberships.find((membership) => membership.workspaceId === workspaceId);
      if (actorMembership?.role === MembershipRole.LAWYER && input.role !== MembershipRole.ASSISTANT) {
        throw new ForbiddenException("Lawyers may invite assistants only.");
      }
      if (workspace.kind === WorkspaceKind.INDIVIDUAL && input.role !== MembershipRole.ASSISTANT) {
        throw new ConflictException("Individual-practice workspaces can invite assistants through this workflow only.");
      }
      const recipient = await tx.user.findFirst({
        where: { id: input.userId, status: "ACTIVE", passwordHash: { not: null } },
        select: { id: true, email: true, emailNormalized: true },
      });
      if (!recipient) throw new NotFoundException("Eligible user not found.");

      const existing = await tx.practiceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: recipient.id } },
        select: { id: true, status: true, role: true, supervisingLawyerMembershipId: true },
      });
      if (existing && existing.status !== MembershipStatus.INVITED) {
        throw new ConflictException("A membership already exists for this user and workspace.");
      }
      let invitedSupervisorId: string | undefined;
      if (actorMembership?.role === MembershipRole.LAWYER) {
        const actorLawyer = await tx.practiceMembership.findFirst({
          where: { workspaceId, userId: actorId, role: MembershipRole.LAWYER, status: MembershipStatus.ACTIVE,
            lawyerProfile: { isNot: null } }, select: { id: true },
        });
        if (!actorLawyer) throw new ForbiddenException("An active lawyer profile is required to invite an assistant.");
        if (existing?.supervisingLawyerMembershipId && existing.supervisingLawyerMembershipId !== actorLawyer.id) {
          throw new ForbiddenException("Lawyers may invite only assistants they supervise.");
        }
        invitedSupervisorId = actorLawyer.id;
      }
      if (existing?.role === MembershipRole.LAWYER && workspace.kind === WorkspaceKind.INDIVIDUAL) {
        throw new ConflictException("The primary lawyer is provisioned through workspace onboarding.");
      }

      const prior = existing ? await tx.workspaceInvitation.findFirst({
        where: { membershipId: existing.id, status: InvitationStatus.PENDING },
        select: { id: true },
      }) : null;
      if (prior) {
        await tx.workspaceInvitation.update({ where: { id: prior.id }, data: { status: InvitationStatus.REVOKED, revokedAt: new Date() } });
        await tx.securityAuditEvent.create({ data: {
          actorUserId: actorId, workspaceId, eventType: "WORKSPACE_INVITATION_REPLACED",
          targetType: "WorkspaceInvitation", targetId: prior.id, requestId,
        } });
      }
      const membership = existing
        ? await tx.practiceMembership.update({ where: { id: existing.id },
          data: { role: input.role, ...(invitedSupervisorId ? { supervisingLawyerMembershipId: invitedSupervisorId } : {}) },
          select: { id: true } })
        : await tx.practiceMembership.create({
          data: { workspaceId, userId: recipient.id, role: input.role, status: MembershipStatus.INVITED,
            ...(invitedSupervisorId ? { supervisingLawyerMembershipId: invitedSupervisorId } : {}) },
          select: { id: true },
        });
      const invitation = await tx.workspaceInvitation.create({
        data: {
          workspaceId, membershipId: membership.id, recipientUserId: recipient.id,
          intendedEmail: recipient.emailNormalized, role: input.role, tokenHash, createdById: actorId, expiresAt,
        },
        select: { id: true, status: true, expiresAt: true },
      });
      await tx.securityAuditEvent.create({ data: {
        actorUserId: actorId, workspaceId, eventType: "WORKSPACE_INVITATION_CREATED",
        targetType: "WorkspaceInvitation", targetId: invitation.id, requestId,
        metadata: { role: input.role, replaced: Boolean(prior) },
      } });
      return { invitation, email: recipient.email };
    }, managementPermissions);

    const delivery = this.environment.invitationDevTokenDelivery
      ? "development_token"
      : await this.deliveryProvider.deliver({ email: result.email, token: rawToken, expiresAt: result.invitation.expiresAt });
    return {
      invitationId: result.invitation.id,
      status: result.invitation.status,
      expiresAt: result.invitation.expiresAt.toISOString(),
      delivery: delivery === "unavailable" ? "not_configured" : delivery,
      ...(this.environment.invitationDevTokenDelivery ? { developmentToken: rawToken } : {}),
    };
  }

  async accept(rawToken: string, actorId: string, sessionId: string, requestId: string) {
    if (!isValidInvitationToken(rawToken)) throw new UnauthorizedException("Invitation is invalid or unavailable.");
    const tokenHash = hashInvitationToken(rawToken);
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      await tx.$queryRaw`SELECT id FROM workspace_invitations WHERE token_hash = ${tokenHash} FOR UPDATE`;
      const invitation = await tx.workspaceInvitation.findUnique({
        where: { tokenHash },
        include: { membership: true, recipient: { select: { id: true, emailNormalized: true, status: true } } },
      });
      if (!invitation) {
        return { rejected: true as const };
      }
      // An acceptance response can be lost after commit. Allow the same recipient
      // to confirm that exact consumed invitation without creating another mutation.
      if (invitation.status === InvitationStatus.ACCEPTED && invitation.recipientUserId === actorId
        && invitation.recipient.status === "ACTIVE") {
        return { rejected: false as const, workspaceId: invitation.workspaceId, membershipId: invitation.membershipId };
      }
      if (invitation.status !== InvitationStatus.PENDING || invitation.recipientUserId !== actorId
        || invitation.recipient.status !== "ACTIVE" || invitation.recipient.emailNormalized !== invitation.intendedEmail) {
        await this.auditAttempt(tx, actorId, invitation.workspaceId, invitation.id, requestId,
          invitation.recipientUserId === actorId ? "invitation_unavailable" : "identity_mismatch");
        return { rejected: true as const };
      }
      const now = new Date();
      if (invitation.expiresAt <= now) {
        await tx.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.EXPIRED } });
        await tx.securityAuditEvent.create({ data: {
          actorUserId: actorId, workspaceId: invitation.workspaceId, eventType: "WORKSPACE_INVITATION_EXPIRED",
          targetType: "WorkspaceInvitation", targetId: invitation.id, requestId,
        } });
        return { rejected: true as const };
      }
      const workspace = await tx.practiceWorkspace.findUnique({ where: { id: invitation.workspaceId }, select: { status: true } });
      if (!workspace || workspace.status !== "ACTIVE" || invitation.membership.status !== MembershipStatus.INVITED
        || invitation.membership.role !== invitation.role) {
        await this.auditAttempt(tx, actorId, invitation.workspaceId, invitation.id, requestId,
          "workspace_or_membership_inactive");
        return { rejected: true as const };
      }
      if (invitation.membership.role === MembershipRole.ASSISTANT) {
        const supervisorId = invitation.membership.supervisingLawyerMembershipId;
        if (!supervisorId) {
          await this.auditAttempt(tx, actorId, invitation.workspaceId, invitation.id, requestId,
            "assistant_supervisor_missing");
          return { rejected: true as const };
        }
        const supervisor = await tx.practiceMembership.findFirst({
          where: { id: supervisorId, workspaceId: invitation.workspaceId, role: MembershipRole.LAWYER,
            status: MembershipStatus.ACTIVE, lawyerProfile: { isNot: null } }, select: { id: true },
        });
        if (!supervisor) {
          await this.auditAttempt(tx, actorId, invitation.workspaceId, invitation.id, requestId,
            "assistant_supervisor_inactive");
          return { rejected: true as const };
        }
      }
      await tx.practiceMembership.update({ where: { id: invitation.membershipId }, data: { status: MembershipStatus.ACTIVE, joinedAt: now } });
      await tx.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.ACCEPTED, acceptedAt: now } });
      await tx.securityAuditEvent.create({ data: {
        actorUserId: actorId, workspaceId: invitation.workspaceId, eventType: "WORKSPACE_INVITATION_ACCEPTED",
        targetType: "WorkspaceInvitation", targetId: invitation.id, requestId,
        metadata: { membershipId: invitation.membershipId, role: invitation.membership.role },
      } });
      return { rejected: false as const, workspaceId: invitation.workspaceId, membershipId: invitation.membershipId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => {
      if (isConflict(error)) throw new ConflictException("Invitation acceptance conflicts with current workspace state.");
      throw error;
    });
    if (result.rejected) throw new GoneException("Invitation is invalid or unavailable.");
    return { accepted: true, workspaceId: result.workspaceId, membershipId: result.membershipId };
  }

  async revoke(workspaceId: string, invitationId: string, actorId: string, sessionId: string, requestId: string) {
    return this.transact(actorId, sessionId, workspaceId, requestId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM workspace_invitations WHERE id = ${invitationId}::uuid AND workspace_id = ${workspaceId}::uuid FOR UPDATE`;
      const invitation = await tx.workspaceInvitation.findFirst({ where: { id: invitationId, workspaceId }, select: { id: true, status: true } });
      if (!invitation) throw new NotFoundException("Invitation not found.");
      if (invitation.status !== InvitationStatus.PENDING) throw new ConflictException("Only pending invitations can be revoked.");
      await tx.workspaceInvitation.update({ where: { id: invitationId }, data: { status: InvitationStatus.REVOKED, revokedAt: new Date() } });
      await tx.securityAuditEvent.create({ data: {
        actorUserId: actorId, workspaceId, eventType: "WORKSPACE_INVITATION_REVOKED",
        targetType: "WorkspaceInvitation", targetId: invitationId, requestId,
      } });
      return { id: invitationId, status: InvitationStatus.REVOKED };
    });
  }

  private async transact<T>(actorId: string, sessionId: string, workspaceId: string, requestId: string,
    operation: (tx: Transaction, context: AuthorizationContext) => Promise<T>,
    permissions: readonly string[] = [Permission.ManageWorkspaceMemberships]): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, actorId, sessionId);
      await tx.$queryRaw`SELECT id FROM practice_memberships WHERE workspace_id = ${workspaceId}::uuid AND user_id = ${actorId}::uuid AND status = 'ACTIVE' FOR UPDATE`;
      const context = await this.contexts.resolveForUser(actorId, tx);
      if (!context || !permissions.some((permission) => this.authorization.hasPermission(context, permission, workspaceId))) {
        throw new ForbiddenException("Permission denied.");
      }
      return operation(tx, context);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => {
      if (isConflict(error)) throw new ConflictException("Invitation change conflicts with current workspace state.");
      throw error;
    });
  }

  private async lockSession(tx: Transaction, actorId: string, sessionId: string): Promise<void> {
    const sessions = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT s.id FROM user_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ${sessionId}::uuid AND s.user_id = ${actorId}::uuid
        AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'ACTIVE'
      FOR SHARE OF s, u`;
    if (sessions.length !== 1) throw new UnauthorizedException("Authentication required.");
  }

  private async auditAttempt(tx: Transaction, actorUserId: string, workspaceId: string, invitationId: string,
    requestId: string, reason: string): Promise<void> {
    await tx.securityAuditEvent.create({ data: {
      actorUserId, workspaceId, eventType: "WORKSPACE_INVITATION_REJECTED",
      targetType: "WorkspaceInvitation", targetId: invitationId, requestId, metadata: { reason },
    } });
  }
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isValidInvitationToken(token: string): boolean {
  if (!TOKEN_PATTERN.test(token)) return false;
  const decoded = Buffer.from(token, "base64url");
  return decoded.length === 32 && decoded.toString("base64url") === token;
}

function isConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return ["P2002", "P2003", "P2034"].includes(error.code);
  const candidate = error as { code?: string; cause?: { code?: string } };
  return ["23503", "23505", "23514", "40001", "P0001"].includes(candidate?.code ?? candidate?.cause?.code ?? "");
}
