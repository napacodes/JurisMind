import { Inject, Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AuthorizationRequest } from "../authorization/authorization.types";
import { hashSessionToken, isValidSessionToken } from "./auth.service";
import { AUTH_ENVIRONMENT, AuthEnvironment, SafeUserIdentity } from "./auth.types";
import { MfaCryptoService, isValidRecoveryCode } from "./mfa-crypto.service";
import { PasswordHasherService } from "./password-hasher.service";
import { LoginRateLimiterService } from "./login-rate-limiter.service";
import { AuthService } from "./auth.service";

@Injectable()
export class MfaService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MfaCryptoService) private readonly crypto: MfaCryptoService,
    @Inject(PasswordHasherService) private readonly passwordHasher: PasswordHasherService,
    @Inject(LoginRateLimiterService) private readonly limiter: LoginRateLimiterService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
  ) {}

  async status(actor: AuthorizationRequest): Promise<{ enabled: boolean; recoveryCodesRemaining: number }> {
    const userId = actor.authorizationContext!.user.id;
    const record = await this.prisma.userMfa.findUnique({ where: { userId }, include: { recoveryCodes: { where: { usedAt: null } } } });
    return { enabled: Boolean(record?.enabledAt), recoveryCodesRemaining: record?.recoveryCodes.length ?? 0 };
  }

  async beginEnrollment(actor: AuthorizationRequest, raw: unknown, requestId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const password = readCredential(raw, "password");
    const userId = actor.authorizationContext!.user.id;
    const rateKey = `mfa-start:${userId}`;
    if (this.limiter.isBlocked(rateKey, "reauth")) throw new UnauthorizedException("Reauthentication failed.");
    this.limiter.recordFailure(rateKey, "reauth");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await this.verifyPassword(password, user.passwordHash))) throw new UnauthorizedException("Reauthentication failed.");
    const existing = await this.prisma.userMfa.findUnique({ where: { userId: user.id } });
    if (existing?.enabledAt) throw new BadRequestException("Multi-factor authentication is already enabled.");
    const secret = this.crypto.generateSecret();
    const pendingExpiresAt = new Date(Date.now() + 10 * 60_000);
    await this.prisma.$transaction(async (tx) => {
      await tx.userMfa.upsert({
        where: { userId: user.id },
        create: { userId: user.id, pendingSecretCiphertext: this.crypto.encryptSecret(secret), pendingExpiresAt },
        update: { pendingSecretCiphertext: this.crypto.encryptSecret(secret), pendingExpiresAt },
      });
      await tx.securityAuditEvent.create({ data: { actorUserId: user.id, eventType: "AUTH_MFA_ENROLLMENT_STARTED", targetType: "User", targetId: user.id, requestId } });
    });
    this.limiter.clearIdentifier(rateKey);
    return { secret, otpauthUrl: `otpauth://totp/JurisMind:${encodeURIComponent(user.email)}?secret=${secret}&issuer=JurisMind&algorithm=SHA1&digits=6&period=30` };
  }

  async confirmEnrollment(actor: AuthorizationRequest, raw: unknown, requestId: string): Promise<{ enabled: true; recoveryCodes: string[] }> {
    const code = readCode(raw);
    const userId = actor.authorizationContext!.user.id;
    const record = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!record?.pendingSecretCiphertext || !record.pendingExpiresAt || record.pendingExpiresAt <= new Date()) throw new UnauthorizedException("Enrollment has expired. Start again.");
    const secret = this.crypto.decryptSecret(record.pendingSecretCiphertext);
    const counter = this.crypto.verifyTotp(secret, code);
    const rateKey = `mfa-enroll:${userId}`;
    if (this.limiter.isBlocked(rateKey, "enrollment")) throw new UnauthorizedException("The verification code is invalid.");
    this.limiter.recordFailure(rateKey, "enrollment");
    if (counter === null) throw new UnauthorizedException("The verification code is invalid.");
    const recoveryCodes = this.crypto.generateRecoveryCodes();
    await this.prisma.$transaction(async (tx) => {
      const activated = await tx.userMfa.updateMany({ where: { userId, secretCiphertext: null, enabledAt: null, pendingSecretCiphertext: record.pendingSecretCiphertext, pendingExpiresAt: { gt: new Date() } }, data: { secretCiphertext: record.pendingSecretCiphertext, pendingSecretCiphertext: null, pendingExpiresAt: null, enabledAt: new Date(), lastTotpCounter: counter } });
      if (activated.count !== 1) throw new UnauthorizedException("Enrollment changed. Start again.");
      await tx.mfaRecoveryCode.createMany({ data: recoveryCodes.map((value) => ({ userId, codeHash: this.crypto.recoveryCodeHash(value) })) });
      await tx.securityAuditEvent.create({ data: { actorUserId: userId, eventType: "AUTH_MFA_ENABLED", targetType: "User", targetId: userId, requestId, metadata: { recoveryCodeCount: recoveryCodes.length } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    this.limiter.clearIdentifier(rateKey);
    return { enabled: true, recoveryCodes };
  }

  async challenge(rawToken: string | undefined, raw: unknown, requestId: string): Promise<{ user: SafeUserIdentity; rawSessionToken: string; expiresAt: Date }> {
    if (!rawToken || !isValidSessionToken(rawToken)) throw new UnauthorizedException("Invalid or expired verification challenge.");
    const code = readCode(raw);
    const hash = hashSessionToken(rawToken);
    const rateKey = `mfa-challenge:${hash}`;
    if (this.limiter.isBlocked(rateKey, "challenge")) throw new UnauthorizedException("Invalid or expired verification challenge.");
    this.limiter.recordFailure(rateKey, "challenge");
    const challenge = await this.prisma.loginMfaChallenge.findUnique({ where: { tokenHash: hash }, include: { mfa: { include: { recoveryCodes: true } } } });
    const encryptedSecret = challenge?.mfa.secretCiphertext;
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.attempts >= 5 || !challenge.mfa.enabledAt || !encryptedSecret) throw new UnauthorizedException("Invalid or expired verification challenge.");
    const userRecord = await this.prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!userRecord || userRecord.status !== "ACTIVE") throw new UnauthorizedException("Invalid or expired verification challenge.");
    if (!(await this.authService.isEligibleForAudience(challenge.userId, challenge.audience))) throw new UnauthorizedException("Invalid or expired verification challenge.");
    const mfa = challenge.mfa;
    let recovery: { id: string } | null = null;
    let counter: number | null = null;
    if (isValidRecoveryCode(code)) {
      const codeHash = this.crypto.recoveryCodeHash(code);
      const found = mfa.recoveryCodes.find((item) => item.codeHash === codeHash && !item.usedAt);
      if (found) recovery = { id: found.id };
    } else {
      const secret = this.crypto.decryptSecret(encryptedSecret);
      counter = this.crypto.verifyTotp(secret, code);
      if (counter !== null && counter <= mfa.lastTotpCounter) counter = null;
    }
    if (!recovery && counter === null) {
      await this.prisma.$transaction(async (tx) => {
        await tx.loginMfaChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
        await tx.securityAuditEvent.create({ data: { actorUserId: challenge.userId, eventType: "AUTH_MFA_CHALLENGE_FAILED", requestId } });
      });
      throw new UnauthorizedException("Invalid or expired verification challenge.");
    }
    const now = new Date();
    const user: SafeUserIdentity = { id: userRecord.id, email: userRecord.email, fullName: userRecord.fullName };
    let rawSessionToken = "";
    let expiresAt = now;
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.loginMfaChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: 5 } }, data: { consumedAt: now } });
      if (consumed.count !== 1) throw new UnauthorizedException("Invalid or expired verification challenge.");
      if (recovery) {
        const use = await tx.mfaRecoveryCode.updateMany({ where: { id: recovery.id, usedAt: null }, data: { usedAt: now } });
        if (use.count !== 1) throw new UnauthorizedException("Invalid or expired verification challenge.");
      } else if (counter !== null) {
        const claimedCounter = await tx.userMfa.updateMany({ where: { userId: challenge.userId, lastTotpCounter: { lt: counter }, enabledAt: { not: null } }, data: { lastTotpCounter: counter } });
        if (claimedCounter.count !== 1) throw new UnauthorizedException("Invalid or expired verification challenge.");
      }
      const token = randomBytes(32).toString("base64url");
      rawSessionToken = token;
      expiresAt = new Date(now.getTime() + this.environment.sessionTtlSeconds * 1000);
      const id = randomUUID();
      await tx.userSession.create({ data: { id, userId: challenge.userId, audience: challenge.audience, tokenHash: hashSessionToken(token), expiresAt } });
      await tx.securityAuditEvent.create({ data: { actorUserId: challenge.userId, eventType: "AUTH_LOGIN_SUCCEEDED", targetType: "UserSession", targetId: id, requestId, metadata: { mfaVerified: true, recoveryCodeUsed: Boolean(recovery), expiresAt: expiresAt.toISOString() } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    this.limiter.clearIdentifier(rateKey);
    return { user, rawSessionToken, expiresAt };
  }

  async disable(actor: AuthorizationRequest, raw: unknown, requestId: string): Promise<{ disabled: true }> {
    const { password, code } = readReauth(raw);
    const userId = actor.authorizationContext!.user.id;
    const rateKey = `mfa-disable:${userId}`;
    if (this.limiter.isBlocked(rateKey, "reauth")) throw new UnauthorizedException("Reauthentication failed.");
    this.limiter.recordFailure(rateKey, "reauth");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!user?.passwordHash || !mfa?.enabledAt || !mfa.secretCiphertext || !(await this.passwordHasher.verify(password, user.passwordHash))) throw new UnauthorizedException("Reauthentication failed.");
    const counter = this.crypto.verifyTotp(this.crypto.decryptSecret(mfa.secretCiphertext), code);
    if (counter === null || counter <= mfa.lastTotpCounter) throw new UnauthorizedException("Reauthentication failed.");
    await this.prisma.$transaction(async (tx) => {
      const disabled = await tx.userMfa.updateMany({ where: { userId, enabledAt: mfa.enabledAt, lastTotpCounter: { lt: counter } }, data: { secretCiphertext: null, enabledAt: null, pendingSecretCiphertext: null, pendingExpiresAt: null, lastTotpCounter: counter } });
      if (disabled.count !== 1) throw new UnauthorizedException("Reauthentication failed.");
      await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
      await tx.loginMfaChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
      if (actor.authenticatedSessionId) {
        await tx.userSession.updateMany({ where: { userId, id: { not: actor.authenticatedSessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await tx.securityAuditEvent.create({ data: { actorUserId: userId, eventType: "AUTH_MFA_DISABLED", targetType: "User", targetId: userId, requestId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    this.limiter.clearIdentifier(rateKey);
    return { disabled: true };
  }

  async regenerateRecoveryCodes(actor: AuthorizationRequest, raw: unknown, requestId: string): Promise<{ recoveryCodes: string[] }> {
    const { password, code } = readReauth(raw);
    const userId = actor.authorizationContext!.user.id;
    const rateKey = `mfa-recovery:${userId}`;
    if (this.limiter.isBlocked(rateKey, "reauth")) throw new UnauthorizedException("Reauthentication failed.");
    this.limiter.recordFailure(rateKey, "reauth");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!user?.passwordHash || !mfa?.enabledAt || !mfa.secretCiphertext || !(await this.passwordHasher.verify(password, user.passwordHash))) throw new UnauthorizedException("Reauthentication failed.");
    const counter = this.crypto.verifyTotp(this.crypto.decryptSecret(mfa.secretCiphertext), code);
    if (counter === null || counter <= mfa.lastTotpCounter) throw new UnauthorizedException("Reauthentication failed.");
    const recoveryCodes = this.crypto.generateRecoveryCodes();
    await this.prisma.$transaction(async (tx) => {
      const claimedCounter = await tx.userMfa.updateMany({ where: { userId, lastTotpCounter: { lt: counter }, enabledAt: { not: null } }, data: { lastTotpCounter: counter } });
      if (claimedCounter.count !== 1) throw new UnauthorizedException("Reauthentication failed.");
      await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
      await tx.mfaRecoveryCode.createMany({ data: recoveryCodes.map((value) => ({ userId, codeHash: this.crypto.recoveryCodeHash(value) })) });
      await tx.securityAuditEvent.create({ data: { actorUserId: userId, eventType: "AUTH_MFA_RECOVERY_CODES_REGENERATED", targetType: "User", targetId: userId, requestId, metadata: { count: recoveryCodes.length } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    this.limiter.clearIdentifier(rateKey);
    return { recoveryCodes };
  }

  private async verifyPassword(raw: string, hash: string): Promise<boolean> {
    return this.passwordHasher.verify(raw, hash);
  }
}

function readReauth(raw: unknown): { password: string; code: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid request.");
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["password", "code"].includes(key)) || typeof value.password !== "string" || value.password.length > 256 || typeof value.code !== "string" || value.code.length > 64) throw new BadRequestException("Invalid request.");
  return { password: value.password, code: value.code.trim() };
}

function readCredential(raw: unknown, key: string): string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid request.");
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((item) => item !== key) || typeof value[key] !== "string" || (value[key] as string).length > 256) throw new BadRequestException("Invalid request.");
  return value[key] as string;
}

function readCode(raw: unknown): string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid verification code.");
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((item) => item !== "code") || typeof value.code !== "string" || value.code.length > 64) throw new BadRequestException("Invalid verification code.");
  return value.code.trim();
}
