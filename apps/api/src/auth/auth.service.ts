import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { AUTH_ENVIRONMENT, AuthEnvironment, LoginResult, SafeUserIdentity } from "./auth.types";
import { LoginRateLimiterService } from "./login-rate-limiter.service";
import { PasswordHasherService } from "./password-hasher.service";

const GENERIC_LOGIN_ERROR = "Invalid email or password.";
const DUMMY_ARGON2ID_HASH = "$argon2id$v=19$m=19456,p=1,t=2$lwhxPDjUc9x2UW+N3fTRKQ$jXo45gePoEM5xukYffZEvld7LU/1aBtUnpbObMDhDVw";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

interface LoginPayload {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordHasherService) private readonly passwordHasher: PasswordHasherService,
    @Inject(LoginRateLimiterService) private readonly rateLimiter: LoginRateLimiterService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
  ) {}

  async login(rawPayload: unknown, remoteAddress: string, requestId: string): Promise<LoginResult> {
    const payload = this.parseLoginPayload(rawPayload);
    const normalizedEmail = payload?.email ?? "<invalid-login>";
    if (this.rateLimiter.isBlocked(normalizedEmail, remoteAddress)) {
      await this.recordFailedLogin(requestId, "throttled");
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const user = payload
      ? await this.prisma.user.findUnique({ where: { emailNormalized: normalizedEmail } })
      : null;
    const hash = user?.passwordHash ?? DUMMY_ARGON2ID_HASH;
    const passwordMatches = await this.passwordHasher.verify(payload?.password ?? "invalid", hash);
    if (!payload || !user || !user.passwordHash || !passwordMatches || user.status !== "ACTIVE") {
      this.rateLimiter.recordFailure(normalizedEmail, remoteAddress);
      await this.recordFailedLogin(requestId, "invalid_credentials");
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    this.rateLimiter.clearIdentifier(normalizedEmail);
    const rawSessionToken = randomBytes(32).toString("base64url");
    const tokenHash = hashSessionToken(rawSessionToken);
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.environment.sessionTtlSeconds * 1000);
    const safeUser = toSafeUser(user);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.userSession.create({
        data: { id: sessionId, userId: user.id, tokenHash, expiresAt },
      });
      await transaction.securityAuditEvent.create({
        data: {
          actorUserId: user.id,
          eventType: "AUTH_LOGIN_SUCCEEDED",
          targetType: "UserSession",
          targetId: sessionId,
          requestId,
          metadata: { expiresAt: expiresAt.toISOString() },
        },
      });
    });

    return { user: safeUser, rawSessionToken, expiresAt };
  }

  async currentUser(rawSessionToken: string | undefined): Promise<SafeUserIdentity | null> {
    const session = await this.currentSession(rawSessionToken);
    return session?.user ?? null;
  }

  async currentSession(rawSessionToken: string | undefined): Promise<{
    user: SafeUserIdentity;
    sessionId: string;
  } | null> {
    if (!rawSessionToken || !isValidSessionToken(rawSessionToken)) return null;
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: hashSessionToken(rawSessionToken) },
      include: { user: true },
    });
    if (!session) return null;

    const now = new Date();
    if (
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE"
    ) {
      if (!session.revokedAt) {
        await this.prisma.userSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now },
        });
      }
      return null;
    }

    // Re-check the authorization predicates in the write that marks the
    // session active. A concurrent logout, expiry, or account disable must
    // not race past the earlier read and return an authenticated identity.
    const active = await this.prisma.userSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: { gt: now },
        user: { is: { status: "ACTIVE" } },
      },
      data: { lastSeenAt: now },
    });
    if (active.count !== 1) return null;
    return { user: toSafeUser(session.user), sessionId: session.id };
  }

  async logout(rawSessionToken: string | undefined, requestId: string): Promise<void> {
    if (!rawSessionToken || !isValidSessionToken(rawSessionToken)) return;
    const tokenHash = hashSessionToken(rawSessionToken);
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (!session || session.revokedAt) return;

    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.userSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (result.count === 1) {
        await transaction.securityAuditEvent.create({
          data: {
            actorUserId: session.userId,
            eventType: "AUTH_LOGOUT",
            targetType: "UserSession",
            targetId: session.id,
            requestId,
          },
        });
      }
    });
  }

  private async recordFailedLogin(requestId: string, reason: "invalid_credentials" | "throttled"): Promise<void> {
    await this.prisma.securityAuditEvent.create({
      data: {
        eventType: reason === "throttled" ? "AUTH_LOGIN_THROTTLED" : "AUTH_LOGIN_FAILED",
        requestId,
        metadata: { reason },
      },
    });
  }

  private parseLoginPayload(raw: unknown): LoginPayload | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    if (
      Object.keys(record).some((key) => key !== "email" && key !== "password") ||
      typeof record.email !== "string" ||
      typeof record.password !== "string" ||
      record.email.length > 320 ||
      record.password.length > 256 ||
      Buffer.byteLength(record.password, "utf8") > 1024
    ) {
      return null;
    }
    const email = record.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { email, password: record.password };
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isValidSessionToken(token: string): boolean {
  if (!TOKEN_PATTERN.test(token)) return false;
  const decoded = Buffer.from(token, "base64url");
  return decoded.byteLength === 32 && decoded.toString("base64url") === token;
}

export function createRequestId(value: string | undefined): string {
  return value && value.length <= 120 && /^[A-Za-z0-9._:-]+$/.test(value)
    ? value
    : randomUUID();
}

function toSafeUser(user: { id: string; email: string; fullName: string }): SafeUserIdentity {
  return { id: user.id, email: user.email, fullName: user.fullName };
}
