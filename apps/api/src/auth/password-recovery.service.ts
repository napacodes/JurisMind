import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "./auth.types";
import { PASSWORD_RESET_DELIVERY, PasswordResetDelivery } from "./password-reset-delivery";
import { PasswordHasherService } from "./password-hasher.service";
import { LoginRateLimiterService } from "./login-rate-limiter.service";

const RESET_TTL_MS = 30 * 60 * 1000;
const GENERIC_RESPONSE_FLOOR_MS = 200;
const GENERIC_RESPONSE = { message: "If an eligible account exists, password reset instructions will be sent." };
const GENERIC_INVALID = "This reset link is invalid or expired. Request a new link and try again.";

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordHasherService) private readonly hasher: PasswordHasherService,
    @Inject(LoginRateLimiterService) private readonly limiter: LoginRateLimiterService,
    @Inject(PASSWORD_RESET_DELIVERY) private readonly delivery: PasswordResetDelivery,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
  ) {}

  async request(raw: unknown, ip: string, requestId: string): Promise<typeof GENERIC_RESPONSE> {
    const requestStartedAt = Date.now();
    const email = readEmail(raw);
    const key = email ?? "<invalid-reset-request>";
    const blocked = this.limiter.isBlocked(key, ip);
    this.limiter.recordFailure(key, ip);
    if (!email || blocked || (!this.environment.passwordResetEmailEndpoint && !this.environment.localPasswordResetSinkEnabled)) return this.delayedGenericResponse(requestStartedAt);
    const user = await this.prisma.user.findUnique({ where: { emailNormalized: email } });
    if (!user || !user.passwordHash || user.status !== "ACTIVE") return this.delayedGenericResponse(requestStartedAt);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);
    try {
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
      await tx.securityAuditEvent.create({ data: { actorUserId: user.id, eventType: "AUTH_PASSWORD_RESET_REQUESTED", targetType: "User", targetId: user.id, requestId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch {
      return this.delayedGenericResponse(requestStartedAt);
    }
    const url = `${this.environment.publicWebUrl}/pages/auth/reset-password#token=${token}`;
    void this.delivery.send(user.email, url, expiresAt)
      .then((delivered) => delivered ? undefined : this.recordDeliveryFailure(user.id, tokenHash, requestId))
      .catch(() => this.recordDeliveryFailure(user.id, tokenHash, requestId))
      .catch(() => undefined);
    return this.delayedGenericResponse(requestStartedAt);
  }

  private async delayedGenericResponse(startedAt: number): Promise<typeof GENERIC_RESPONSE> {
    const remaining = GENERIC_RESPONSE_FLOOR_MS - (Date.now() - startedAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    return GENERIC_RESPONSE;
  }

  private async recordDeliveryFailure(userId: string, tokenHash: string, requestId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({ where: { tokenHash, usedAt: null }, data: { usedAt: new Date() } });
      await tx.securityAuditEvent.create({ data: { actorUserId: userId, eventType: "AUTH_PASSWORD_RESET_DELIVERY_FAILED", targetType: "User", targetId: userId, requestId } });
    });
  }

  async complete(raw: unknown, ip: string, requestId: string): Promise<{ reset: true }> {
    const input = readReset(raw);
    const tokenHash = input ? sha256(input.token) : "<invalid-reset-token>";
    if (this.limiter.isBlocked(tokenHash, ip)) throw new UnauthorizedException(GENERIC_INVALID);
    this.limiter.recordFailure(tokenHash, ip);
    if (!input) throw new UnauthorizedException(GENERIC_INVALID);
    const passwordHash = await this.hasher.hash(input.password, this.environment.passwordMinLength);
    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const record = await tx.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
        if (!record || record.usedAt || record.expiresAt <= now || record.user.status !== "ACTIVE") throw new Error("INVALID_RESET");
        const consumed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
        if (consumed.count !== 1) throw new Error("INVALID_RESET");
        await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
        await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: now } });
        await tx.userSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: now } });
        await tx.loginMfaChallenge.updateMany({ where: { userId: record.userId, consumedAt: null }, data: { consumedAt: now } });
        await tx.securityAuditEvent.create({ data: { actorUserId: record.userId, eventType: "AUTH_PASSWORD_RESET_SUCCEEDED", targetType: "User", targetId: record.userId, requestId } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { reset: true };
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_RESET") {
        await this.prisma.securityAuditEvent.create({ data: { eventType: "AUTH_PASSWORD_RESET_FAILED", requestId, metadata: { reason: "invalid_or_expired" } } }).catch(() => undefined);
        throw new UnauthorizedException(GENERIC_INVALID);
      }
      throw error;
    }
    finally { this.limiter.clearIdentifier(tokenHash); }
  }
}

function readEmail(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((key) => key !== "email") || typeof value.email !== "string" || value.email.length > 320) return null;
  const email = value.email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function readReset(raw: unknown): { token: string; password: string } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["token", "password"].includes(key))) return null;
  if (typeof value.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value.token) || typeof value.password !== "string") return null;
  if (Buffer.from(value.token, "base64url").length !== 32 || Buffer.from(value.token, "base64url").toString("base64url") !== value.token) return null;
  return { token: value.token, password: value.password };
}

function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
