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
import type { CreatePlatformAdminInput, PlatformUserListQuery, PracticeUserListQuery } from "./platform-users.dto";

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

  async listPractice(query: PracticeUserListQuery, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireAdmin(tx, actorId, sessionId);
      const now = new Date();
      const today = new Date(now); today.setUTCHours(0, 0, 0, 0);
      const yesterday = new Date(today); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const weekAgo = new Date(today); weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
      const twoWeeksAgo = new Date(weekAgo); twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 7);
      const sevenDaysAgo = new Date(today); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
      const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const kycPending = { OR: [
        { memberships: { some: { status: "ACTIVE", role: "LAWYER", workspace: { is: { status: "ACTIVE" } }, credentialSubmissions: { some: { status: "PENDING" } } } } },
        { memberships: { some: { status: "ACTIVE", role: "FIRM_ADMIN", workspace: { is: { kind: "FIRM", firmVerifications: { some: { status: "PENDING" } } } } } } },
      ] } satisfies Prisma.UserWhereInput;
      const membershipScope: Prisma.PracticeMembershipWhereInput = query.role === "FIRM"
        ? { status: "ACTIVE", role: "FIRM_ADMIN", workspace: { is: { kind: "FIRM", status: "ACTIVE" } } }
        : { status: "ACTIVE", workspace: { is: { status: "ACTIVE" } }, ...(query.role ? { role: query.role } : {}) };
      const base: Prisma.UserWhereInput = {
        platformRoleGrants: { none: { role: "SUPER_ADMIN", revokedAt: null } },
        memberships: { some: membershipScope },
        ...(query.status ? { status: query.status } : {}),
        ...(query.emailStatus ? { emailVerifiedAt: query.emailStatus === "VERIFIED" ? { not: null } : null } : {}),
        ...(query.search ? { OR: [ { fullName: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }, { emailNormalized: { contains: query.search.toLowerCase() } } ] } : {}),
        ...(query.kycStatus === "PENDING" ? kycPending : {}),
        ...(query.kycStatus === "VERIFIED" ? { AND: [{ OR: [
          { memberships: { some: { status: "ACTIVE", role: "LAWYER", workspace: { is: { status: "ACTIVE" } }, credentialSubmissions: { some: { status: "APPROVED" } } } } },
          { memberships: { some: { status: "ACTIVE", role: "FIRM_ADMIN", workspace: { is: { kind: "FIRM", status: "ACTIVE", firmVerifications: { some: { status: "APPROVED" } } } } } } },
        ] }] } : {}),
        ...(query.kycStatus === "NOT_SUBMITTED" ? { AND: [{ memberships: { some: {
          status: "ACTIVE", role: { in: ["LAWYER", "FIRM_ADMIN"] }, credentialSubmissions: { none: {} },
          workspace: { is: { firmVerifications: { none: {} } } },
        } } }] } : {}),
      };
      const allPractice: Prisma.UserWhereInput = {
        platformRoleGrants: { none: { role: "SUPER_ADMIN", revokedAt: null } },
        memberships: { some: { status: "ACTIVE", workspace: { is: { status: "ACTIVE" } } } },
      };
      const [total, users, activeTodayIds, activeYesterdayIds, createdThisWeek, createdPreviousWeek, suspended, kycPendingCount, daily, dailyActivity] = await Promise.all([
        tx.user.count({ where: base }),
        tx.user.findMany({ where: base, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize,
          select: { id: true, email: true, fullName: true, status: true, emailVerifiedAt: true, createdAt: true,
            sessions: { where: { lastSeenAt: { not: null }, audience: { not: "ADMINISTRATION" } }, orderBy: { lastSeenAt: "desc" }, take: 1, select: { lastSeenAt: true } },
            memberships: { where: { status: "ACTIVE", workspace: { is: { status: "ACTIVE" } } }, orderBy: { joinedAt: "desc" },
              select: { id: true, role: true, joinedAt: true, workspace: { select: { id: true, name: true, kind: true,
                firmVerifications: { where: { status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, take: 1, select: { status: true, documents: { select: { id: true } } } } } },
                credentialSubmissions: { where: { status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, take: 1, select: { status: true, documents: { select: { id: true } } } } } } } }),
        tx.userSession.findMany({ where: { lastSeenAt: { gte: today }, audience: { not: "ADMINISTRATION" }, user: { ...allPractice, status: "ACTIVE" } }, distinct: ["userId"], select: { userId: true } }),
        tx.userSession.findMany({ where: { lastSeenAt: { gte: yesterday, lt: today }, audience: { not: "ADMINISTRATION" }, user: { ...allPractice, status: "ACTIVE" } }, distinct: ["userId"], select: { userId: true } }),
        tx.user.count({ where: { ...allPractice, createdAt: { gte: weekAgo } } }),
        tx.user.count({ where: { ...allPractice, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
        tx.user.count({ where: { ...allPractice, status: "DISABLED" } }),
        tx.user.count({ where: { ...allPractice, ...kycPending } }),
        tx.user.groupBy({ by: ["createdAt"], where: { ...allPractice, createdAt: { gte: sevenDaysAgo } }, _count: true }),
        tx.$queryRaw<Array<{ day: string; count: number }>>`
          SELECT (s.last_seen_at AT TIME ZONE 'UTC')::date::text AS day, COUNT(DISTINCT s.user_id)::int AS count
          FROM user_sessions s
          WHERE s.last_seen_at >= ${sevenDaysAgo} AND s.last_seen_at < ${tomorrow}
            AND s.audience <> 'ADMINISTRATION'
            AND EXISTS (
              SELECT 1 FROM users u
              WHERE u.id = s.user_id AND u.status = 'ACTIVE'
                AND NOT EXISTS (SELECT 1 FROM platform_role_grants p WHERE p.user_id = u.id AND p.role = 'SUPER_ADMIN' AND p.revoked_at IS NULL)
                AND EXISTS (
                  SELECT 1 FROM practice_memberships m JOIN practice_workspaces w ON w.id = m.workspace_id
                  WHERE m.user_id = u.id AND m.status = 'ACTIVE' AND w.status = 'ACTIVE'
                )
            )
          GROUP BY 1
        `,
      ]);
      return { users: users.map((user) => {
        const membership = user.memberships.find((item) => query.role === "FIRM" ? item.role === "FIRM_ADMIN" && item.workspace.kind === "FIRM" : query.role ? item.role === query.role : true) ?? user.memberships[0];
        const kycStatus = membership?.role === "FIRM_ADMIN" ? membership.workspace.firmVerifications[0]?.status ?? "NOT_SUBMITTED" : membership?.credentialSubmissions[0]?.status ?? "NOT_SUBMITTED";
        const documentsSubmitted = membership?.role === "FIRM_ADMIN"
          ? (membership.workspace.firmVerifications[0]?.documents.length ?? 0) > 0
          : (membership?.credentialSubmissions[0]?.documents.length ?? 0) > 0;
        return { id: user.id, email: user.email, fullName: user.fullName, status: user.status, emailVerifiedAt: user.emailVerifiedAt,
          createdAt: user.createdAt, lastLoginAt: user.sessions[0]?.lastSeenAt ?? null,
          role: membership?.role === "FIRM_ADMIN" ? "FIRM" : membership?.role ?? "LAWYER", workspaceName: membership?.workspace.name ?? "Practice account",
          joinedAt: membership?.joinedAt ?? user.createdAt, kycStatus, documentStatus: documentsSubmitted ? "SUBMITTED" : "MISSING" };
      }), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
        statistics: { total: await tx.user.count({ where: allPractice }), activeToday: activeTodayIds.length, activeYesterday: activeYesterdayIds.length, createdThisWeek, createdPreviousWeek,
          kycPending: kycPendingCount, suspended, dailyActivity: Array.from({ length: 7 }, (_, index) => {
            const day = new Date(sevenDaysAgo); day.setUTCDate(day.getUTCDate() + index);
            return dailyActivity.find((entry) => entry.day === day.toISOString().slice(0, 10))?.count ?? 0;
          }), dailyJoins: Array.from({ length: 7 }, (_, index) => {
            const day = new Date(sevenDaysAgo); day.setUTCDate(day.getUTCDate() + index);
            return daily.filter((entry) => entry.createdAt.toISOString().slice(0, 10) === day.toISOString().slice(0, 10)).reduce((sum, entry) => sum + entry._count, 0);
          }) } };
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
