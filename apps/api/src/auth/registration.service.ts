import { BadRequestException, ConflictException, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";
import { MembershipRole, MembershipStatus, WorkspaceKind } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AUTH_ENVIRONMENT, AuthEnvironment, LoginResult, SafeUserIdentity } from "./auth.types";
import { hashSessionToken } from "./auth.service";
import { LoginRateLimiterService } from "./login-rate-limiter.service";
import { PasswordHasherService } from "./password-hasher.service";
import type { AccountRegistration, RegistrationKind } from "./registration.dto";

@Injectable()
export class RegistrationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordHasherService) private readonly passwordHasher: PasswordHasherService,
    @Inject(LoginRateLimiterService) private readonly rateLimiter: LoginRateLimiterService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
  ) {}

  async register(kind: RegistrationKind, input: AccountRegistration, remoteAddress: string, requestId: string): Promise<LoginResult> {
    if (this.rateLimiter.isRegistrationBlocked(input.email, remoteAddress)) throw new HttpException("Registration could not be completed. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    let passwordHash: string;
    try {
      passwordHash = await this.passwordHasher.hash(input.password, this.environment.passwordMinLength);
    } catch {
      throw new BadRequestException(`Password must be at least ${this.environment.passwordMinLength} characters.`);
    }

    const userId = randomUUID();
    const workspaceId = randomUUID();
    const membershipId = randomUUID();
    const sessionId = randomUUID();
    const rawSessionToken = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.environment.sessionTtlSeconds * 1000);
    const user: SafeUserIdentity = { id: userId, email: input.email, fullName: input.fullName };

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.create({ data: {
          id: userId,
          email: input.email,
          emailNormalized: input.email,
          fullName: input.fullName,
          passwordHash,
        } });
        await tx.practiceWorkspace.create({ data: {
          id: workspaceId,
          name: kind === "firm" ? input.firmName! : `${input.fullName}'s Practice`,
          slug: `${kind === "firm" ? "firm" : "individual"}-${randomUUID()}`,
          kind: kind === "firm" ? WorkspaceKind.FIRM : WorkspaceKind.INDIVIDUAL,
        } });
        await tx.practiceMembership.create({ data: {
          id: membershipId,
          workspaceId,
          userId,
          role: kind === "firm" ? MembershipRole.FIRM_ADMIN : MembershipRole.LAWYER,
          status: MembershipStatus.ACTIVE,
          joinedAt: now,
        } });
        if (kind === "lawyer") {
          await tx.lawyerProfile.create({ data: { workspaceId, membershipId, isPrimary: true } });
        }
        await tx.userSession.create({ data: { id: sessionId, userId, audience: kind === "firm" ? "FIRM" : "LAWYER", tokenHash: hashSessionToken(rawSessionToken), expiresAt } });
        await tx.securityAuditEvent.create({ data: {
          actorUserId: userId,
          workspaceId,
          eventType: "ACCOUNT_REGISTERED",
          targetType: "PracticeMembership",
          targetId: membershipId,
          requestId,
          metadata: { accountKind: kind, role: kind === "firm" ? MembershipRole.FIRM_ADMIN : MembershipRole.LAWYER },
        } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      this.rateLimiter.clearRegistrationIdentifier(input.email);
      return { user, rawSessionToken, expiresAt };
    } catch (error) {
      const candidate = error as { code?: unknown; meta?: { code?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown } } } };
      const codes = [candidate?.code, candidate?.meta?.code, candidate?.meta?.driverAdapterError?.cause?.originalCode];
      if (codes.some((code) => typeof code === "string" && ["P2002", "P2034", "23505", "40001"].includes(code))) {
        this.rateLimiter.recordRegistrationFailure(input.email, remoteAddress);
        throw new ConflictException("Registration could not be completed with these details.");
      }
      throw error;
    }
  }
}
