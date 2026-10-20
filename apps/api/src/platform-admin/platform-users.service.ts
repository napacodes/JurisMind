import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { MembershipRole, UserStatus } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "../auth/auth.types";
import { PasswordHasherService } from "../auth/password-hasher.service";
import { AuthorizationContextService } from "../authorization/authorization-context.service";
import { AuthorizationService } from "../authorization/authorization.service";
import { Permission } from "../authorization/permissions";
import { PrismaService } from "../database/prisma.service";
import type { AuthorizationContext } from "../authorization/authorization.types";
import type { CreatePlatformAdminInput, PlatformUserListQuery } from "./platform-users.dto";

type Transaction = Prisma.TransactionClient;

@Injectable()
export class PlatformUsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
    @Inject(PasswordHasherService) private readonly passwordHasher: PasswordHasherService,
    @Inject(AuthorizationContextService) private readonly contexts: AuthorizationContextService,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
  ) {}

  async list(query: PlatformUserListQuery, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireAdmin(tx, actorId, sessionId);
      const where = this.listWhere(query);
      const [total, users] = await Promise.all([
        tx.user.count({ where }),
        tx.user.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: {
            id: true, email: true, fullName: true, status: true, emailVerifiedAt: true, createdAt: true,
            platformRoleGrants: { where: { revokedAt: null }, select: { role: true } },
            memberships: {
              where: { status: "ACTIVE", workspace: { is: { status: "ACTIVE" } } },
              select: { role: true, workspace: { select: { id: true, name: true, kind: true } } },
            },
          },
        }),
      ]);
      return {
        users: users.map(({ platformRoleGrants, memberships, ...user }) => ({
          ...user,
          platformRoles: platformRoleGrants.map((grant) => grant.role),
          practiceMemberships: memberships.map((membership) => ({ role: membership.role, workspace: membership.workspace })),
        })),
        pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async get(userId: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireAdmin(tx, actorId, sessionId);
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, fullName: true, status: true, emailVerifiedAt: true, createdAt: true, updatedAt: true,
          platformRoleGrants: { where: { revokedAt: null }, orderBy: { grantedAt: "asc" }, select: { role: true, grantedAt: true } },
          memberships: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true, role: true, status: true, joinedAt: true,
              workspace: { select: { id: true, name: true, kind: true, status: true } },
            },
          },
        },
      });
      if (!user) throw new NotFoundException("User not found.");
      const { platformRoleGrants, ...safeUser } = user;
      return { ...safeUser, platformRoles: platformRoleGrants.map((grant) => grant.role) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async createAdmin(input: CreatePlatformAdminInput, actorId: string, sessionId: string, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireAdmin(tx, actorId, sessionId);
      const emailNormalized = input.email.trim().toLowerCase();
      const existingUser = await tx.user.findUnique({ where: { emailNormalized }, select: { id: true, email: true } });
      if (existingUser) throw new ConflictException("An account with that email already exists.");
      this.passwordHasher.assertValidPassword(input.password, this.environment.passwordMinLength);
      const passwordHash = await this.passwordHasher.hash(input.password, this.environment.passwordMinLength);
      const fullName = input.fullName.trim();
      const created = await tx.user.create({
        data: {
          email: emailNormalized,
          emailNormalized,
          fullName,
          passwordHash,
          status: "ACTIVE",
        },
        select: { id: true, email: true, fullName: true, status: true, createdAt: true },
      });
      await tx.platformRoleGrant.create({
        data: {
          userId: created.id,
          role: "SUPER_ADMIN",
          grantedById: actorId,
        },
      });
      await tx.securityAuditEvent.create({
        data: {
          actorUserId: actorId,
          eventType: "PLATFORM_ADMIN_CREATED",
          targetType: "User",
          targetId: created.id,
          requestId,
          metadata: { email: emailNormalized, fullName, platformRole: "SUPER_ADMIN" },
        },
      });
      return { ...created, platformRoles: ["SUPER_ADMIN"] };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async changeStatus(userId: string, status: UserStatus, actorId: string, sessionId: string, requestId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.requireAdmin(tx, actorId, sessionId);
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        const target = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true, status: true,
            passwordHash: true,
            platformRoleGrants: { where: { role: "SUPER_ADMIN", revokedAt: null }, select: { id: true } },
          },
        });
        if (!target) throw new NotFoundException("User not found.");
        if (status === UserStatus.DISABLED && userId === actorId) {
          throw new ConflictException("You cannot disable your own administrator account.");
        }
        if (target.status === status) return { id: target.id, status, changed: false };

        if (status === UserStatus.DISABLED && target.status === UserStatus.ACTIVE
          && target.passwordHash !== null && target.platformRoleGrants.length > 0) {
          const viableAdministrators = await tx.user.count({
            where: {
              status: UserStatus.ACTIVE,
              passwordHash: { not: null },
              platformRoleGrants: { some: { role: "SUPER_ADMIN", revokedAt: null } },
            },
          });
          if (viableAdministrators <= 1) {
            throw new ConflictException("The last viable platform administrator cannot be disabled.");
          }
        }

        const changed = await tx.user.updateMany({
          where: { id: userId, status: target.status },
          data: { status },
        });
        if (changed.count !== 1) throw new ConflictException("The account status changed concurrently. Refresh and try again.");
        if (status === UserStatus.DISABLED) {
          await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        }
        await tx.securityAuditEvent.create({
          data: {
            actorUserId: actorId,
            eventType: "PLATFORM_USER_STATUS_CHANGED",
            targetType: "User",
            targetId: userId,
            requestId,
            metadata: { fromStatus: target.status, toStatus: status, outcome: "success" },
          },
        });
        return { id: userId, status, changed: true };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof ForbiddenException) {
        await this.auditDenied(actorId, userId, requestId, error.message);
      }
      if (this.isSerializationConflict(error)) {
        throw new ConflictException("The account changed concurrently. Refresh and try again.");
      }
      throw error;
    }
  }

  private listWhere(query: PlatformUserListQuery): Prisma.UserWhereInput {
    const clauses: Prisma.UserWhereInput[] = [];
    if (query.status) clauses.push({ status: query.status });
    if (query.search) {
      clauses.push({ OR: [
        { emailNormalized: { contains: query.search.toLowerCase() } },
        { email: { contains: query.search, mode: "insensitive" } },
        { fullName: { contains: query.search, mode: "insensitive" } },
      ] });
    }

    const workspace = query.workspaceKind ? { kind: query.workspaceKind, status: "ACTIVE" as const } : { status: "ACTIVE" as const };
    if (query.role === "SUPER_ADMIN") {
      clauses.push({ platformRoleGrants: { some: { role: "SUPER_ADMIN", revokedAt: null } } });
      if (query.workspaceKind) {
        clauses.push({ memberships: { some: { status: "ACTIVE", workspace: { is: workspace } } } });
      }
    } else if (query.role) {
      clauses.push({ memberships: { some: { role: query.role as MembershipRole, status: "ACTIVE", workspace: { is: workspace } } } });
    } else if (query.workspaceKind) {
      clauses.push({ memberships: { some: { status: "ACTIVE", workspace: { is: workspace } } } });
    }
    return clauses.length ? { AND: clauses } : {};
  }

  private async requireAdmin(tx: Transaction, actorId: string, sessionId: string): Promise<AuthorizationContext> {
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
    await tx.$queryRaw`SELECT id FROM platform_role_grants WHERE user_id = ${actorId}::uuid AND role = 'SUPER_ADMIN' AND revoked_at IS NULL FOR SHARE`;
    const context = await this.contexts.resolveForUser(actorId, tx);
    if (!context || !this.authorization.hasPermission(context, Permission.PlatformAdministration)) {
      throw new ForbiddenException("Permission denied.");
    }
    return context;
  }

  private async auditDenied(actorId: string, targetId: string, requestId: string, reason: string): Promise<void> {
    await this.prisma.securityAuditEvent.create({
      data: {
        actorUserId: actorId,
        eventType: "PLATFORM_USER_STATUS_CHANGE_DENIED",
        targetType: "User",
        targetId: targetId.slice(0, 200),
        requestId,
        metadata: { outcome: "denied", reason: reason.slice(0, 200) },
      },
    }).catch(() => undefined);
  }

  private isSerializationConflict(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { code?: unknown; meta?: { code?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown } } } };
    return candidate.code === "P2034" || candidate.meta?.code === "40001" || candidate.meta?.code === "40P01"
      || candidate.meta?.driverAdapterError?.cause?.originalCode === "40001"
      || candidate.meta?.driverAdapterError?.cause?.originalCode === "40P01";
  }
}
