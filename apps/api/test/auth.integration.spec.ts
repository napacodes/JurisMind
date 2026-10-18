import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { AuthModule } from "../src/auth/auth.module";
import { AUTH_ENVIRONMENT } from "../src/auth/auth.types";
import { sessionCookieName } from "../src/auth/session-cookie";
import { configureCors } from "../src/config/cors";
import { AuthService, hashSessionToken } from "../src/auth/auth.service";
import type { LoginResult } from "../src/auth/auth.types";
import { LoginRateLimiterService } from "../src/auth/login-rate-limiter.service";
import { PasswordHasherService } from "../src/auth/password-hasher.service";
import type { AuthEnvironment } from "../src/auth/auth.types";
import { PrismaService } from "../src/database/prisma.service";
import { PasswordRecoveryService } from "../src/auth/password-recovery.service";
import { MfaCryptoService } from "../src/auth/mfa-crypto.service";
import { MfaService } from "../src/auth/mfa.service";

const testDatabaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const databaseName = new URL(testDatabaseUrl).pathname.slice(1);
  if (databaseName !== "jurismind_auth_test") {
    throw new Error("Safety stop: AUTH_TEST_DATABASE_URL must target jurismind_auth_test exactly.");
  }
}

test("authentication persistence and lifecycle are enforced by isolated PostgreSQL", {
  skip: !testDatabaseUrl ? "Set AUTH_TEST_DATABASE_URL to the dedicated jurismind_auth_test database." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl! }) });
  const environment: AuthEnvironment = {
    nodeEnv: "test",
    trustedOrigins: ["http://localhost:3000"],
    sessionTtlSeconds: 3_600,
    passwordMinLength: 12,
    loginRateLimitMax: 5,
    loginRateLimitWindowSeconds: 900,
    invitationDevTokenDelivery: false,
    mfaEncryptionKey: Buffer.alloc(32, 1),
    publicWebUrl: "http://localhost:3000",
    passwordResetEmailEndpoint: "https://mail.example.invalid/send",
    passwordResetEmailApiKey: "integration-only",
    passwordResetEmailFrom: "noreply@example.invalid",
  };
  const passwordHasher = new PasswordHasherService();
  const authService = new AuthService(
    prisma as unknown as PrismaService,
    passwordHasher,
    new LoginRateLimiterService(environment),
    environment,
  );
  const userId = randomUUID();
  const email = `phase2-${randomUUID()}@example.invalid`;
  const passwordHash = await passwordHasher.hash("integration-test-password", environment.passwordMinLength);
  const auditRequestIds: string[] = [];
  let userCreated = false;
  let app: INestApplication | undefined;

  try {
    await prisma.$connect();
    const database = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    assert.equal(database[0]?.name, "jurismind_auth_test", "must never test against development database");
    await prisma.user.create({
      data: { id: userId, email, emailNormalized: email, fullName: "Isolated Auth Integration User", passwordHash },
    });
    userCreated = true;

    // Exercise the real HTTP controllers and PostgreSQL-backed session store.
    const httpEnvironment: AuthEnvironment = {
      ...environment,
      nodeEnv: "production",
      trustedOrigins: ["https://app.jurismind.example"],
    };
    const testingModule = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .overrideProvider(AUTH_ENVIRONMENT).useValue(httpEnvironment)
      .compile();
    app = testingModule.createNestApplication({ logger: false });
    configureCors(app, httpEnvironment.trustedOrigins);
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const trustedOrigin = httpEnvironment.trustedOrigins[0]!;
    const cookieName = sessionCookieName(httpEnvironment);
    const productionSinkResponse = await fetch(`${baseUrl}/api/auth/dev/password-reset-sink/read`, {
      method: "POST",
      headers: { authorization: "Bearer integration-only-invalid-key", origin: trustedOrigin },
    });
    assert.equal(productionSinkResponse.status, 404, "local reset sink is unavailable in production configuration");
    const invalidHttpLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST", headers: { origin: trustedOrigin, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "wrong-password-value" }),
    });
    assert.equal(invalidHttpLogin.status, 401);
    const invalidHttpBody = await invalidHttpLogin.json() as { message?: string };
    assert.equal(invalidHttpBody.message, "Invalid email or password.");

    const httpLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST", headers: { origin: trustedOrigin, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "integration-test-password" }),
    });
    assert.equal(httpLogin.status, 200);
    const httpLoginBody = await httpLogin.json() as { user?: { id?: string }; expiresAt?: string };
    assert.equal(httpLoginBody.user?.id, userId);
    assert.equal(typeof httpLoginBody.expiresAt, "string");
    assert.equal(JSON.stringify(httpLoginBody).includes("rawSessionToken"), false);
    const setCookie = httpLogin.headers.get("set-cookie") ?? "";
    assert.match(setCookie, new RegExp(`^${cookieName}=`));
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Secure/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\//i);
    assert.doesNotMatch(setCookie, /Domain=/i, "__Host cookie must not set Domain");
    const cookiePair = setCookie.split(";")[0]!;
    const rawHttpToken = cookiePair.slice(cookiePair.indexOf("=") + 1);
    const httpTokenHash = hashSessionToken(rawHttpToken);
    const persistedHttpSession = await prisma.userSession.findUnique({ where: { tokenHash: httpTokenHash } });
    assert.ok(persistedHttpSession);
    assert.equal(persistedHttpSession.tokenHash, httpTokenHash);
    assert.notEqual(persistedHttpSession.tokenHash, rawHttpToken);

    const currentUserResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: cookiePair } });
    assert.equal(currentUserResponse.status, 200, "real session cookie authenticates current-user requests");
    assert.equal(((await currentUserResponse.json()) as { user: { id: string } }).user.id, userId);
    await prisma.userSession.update({ where: { id: persistedHttpSession.id }, data: {
      createdAt: new Date(Date.now() - 2_000), expiresAt: new Date(Date.now() - 1_000),
    } });
    assert.equal((await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: cookiePair } })).status, 401,
      "expired HTTP sessions are rejected");

    const logoutLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST", headers: { origin: trustedOrigin, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "integration-test-password" }),
    });
    const logoutCookie = logoutLogin.headers.get("set-cookie")?.split(";")[0];
    assert.ok(logoutCookie);
    const logoutToken = logoutCookie.slice(logoutCookie.indexOf("=") + 1);
    const logoutSession = await prisma.userSession.findUniqueOrThrow({ where: { tokenHash: hashSessionToken(logoutToken) } });
    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST", headers: { origin: trustedOrigin, cookie: logoutCookie },
    });
    assert.equal(logoutResponse.status, 204);
    assert.ok((await prisma.userSession.findUniqueOrThrow({ where: { id: logoutSession.id } })).revokedAt);
    assert.equal((await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: logoutCookie } })).status, 401,
      "logout prevents subsequent authenticated requests");
    assert.match(logoutResponse.headers.get("set-cookie") ?? "", /Max-Age=0|Expires=/i,
      "logout clears the browser cookie");

    const invalidRequestId = randomUUID();
    auditRequestIds.push(invalidRequestId);
    await assert.rejects(
      authService.login({ email, password: "wrong-password-value" }, "127.0.0.1", invalidRequestId),
      (error: { status?: number; message?: string }) => error.status === 401 && error.message === "Invalid email or password.",
    );
    const failedEvents = await prisma.securityAuditEvent.findMany({ where: { requestId: invalidRequestId } });
    assert.equal(failedEvents.length, 1);
    assert.equal(failedEvents[0]?.eventType, "AUTH_LOGIN_FAILED");
    assert.equal(JSON.stringify(failedEvents[0]).includes(email), false, "failed-login audit must not store email");

    const loginRequestId = randomUUID();
    auditRequestIds.push(loginRequestId);
    const login = await normalLogin(authService, email, loginRequestId);
    const tokenHash = hashSessionToken(login.rawSessionToken);
    const persisted = await prisma.userSession.findUnique({ where: { tokenHash } });
    assert.ok(persisted, "successful login persists the session");
    assert.equal(persisted.tokenHash, tokenHash);
    assert.notEqual(persisted.tokenHash, login.rawSessionToken, "raw token must never be persisted");
    assert.equal(persisted.expiresAt.toISOString(), login.expiresAt.toISOString());
    const verifiedSession = await authService.currentSession(login.rawSessionToken);
    assert.equal(verifiedSession?.sessionId, persisted.id,
      "the guard can carry the verified server-side session ID without exposing the token");
    assert.deepEqual(await authService.currentUser(login.rawSessionToken), {
      id: userId, email, fullName: "Isolated Auth Integration User",
    });
    const loginAudit = await prisma.securityAuditEvent.findMany({ where: { requestId: loginRequestId } });
    assert.equal(loginAudit.length, 1);
    assert.equal(loginAudit[0]?.eventType, "AUTH_LOGIN_SUCCEEDED");
    assert.equal(JSON.stringify(loginAudit[0]).includes(login.rawSessionToken), false);

    // Cause a real unique-index violation after the new session insert. The
    // transaction must roll that insert back and return an error to the caller.
    const sessionsBeforeFailedLogin = await prisma.userSession.count({ where: { userId } });
    const loginAuditsBeforeFailedLogin = await prisma.securityAuditEvent.count({
      where: { actorUserId: userId, eventType: "AUTH_LOGIN_SUCCEEDED" },
    });
    const failingLoginPrisma = withTransactionFault(prisma, async (transaction) => {
      await transaction.userSession.create({
        data: { id: randomUUID(), userId, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
      });
    });
    const failingLogin = new AuthService(
      failingLoginPrisma,
      passwordHasher,
      new LoginRateLimiterService(environment),
      environment,
    );
    await assert.rejects(failingLogin.login(
      { email, password: "integration-test-password" }, "127.0.0.1", randomUUID(),
    ));
    assert.equal(await prisma.userSession.count({ where: { userId } }), sessionsBeforeFailedLogin,
      "failed login transaction must leave no session behind");
    assert.equal(await prisma.securityAuditEvent.count({
      where: { actorUserId: userId, eventType: "AUTH_LOGIN_SUCCEEDED" },
    }), loginAuditsBeforeFailedLogin, "failed login must not leave a success audit event");

    // A database error during audit recording after revocation must roll back
    // the revocation and prevent a false successful logout response.
    const failingLogoutPrisma = withTransactionFault(prisma, async (transaction) => {
      await transaction.securityAuditEvent.create({
        data: { eventType: "X".repeat(121) },
      });
    });
    const failingLogout = new AuthService(
      failingLogoutPrisma,
      passwordHasher,
      new LoginRateLimiterService(environment),
      environment,
    );
    const logoutAuditsBeforeFailure = await prisma.securityAuditEvent.count({
      where: { actorUserId: userId, eventType: "AUTH_LOGOUT" },
    });
    await assert.rejects(failingLogout.logout(login.rawSessionToken, randomUUID()));
    const afterFailedLogout = await prisma.userSession.findUnique({ where: { id: persisted.id } });
    assert.equal(afterFailedLogout?.revokedAt, null, "failed audit write must roll back session revocation");
    assert.equal(await prisma.securityAuditEvent.count({
      where: { actorUserId: userId, eventType: "AUTH_LOGOUT" },
    }), logoutAuditsBeforeFailure, "failed logout must not leave an audit event");
    assert.ok(await authService.currentUser(login.rawSessionToken), "session remains valid after rolled-back logout");

    // Pause the read-then-claim path after it has read an active session. A
    // concurrent logout must win before the conditional lastSeenAt update.
    const racingLogin = await normalLogin(authService, email, randomUUID());
    let claimReached!: () => void;
    let allowClaim!: () => void;
    const claimReachedPromise = new Promise<void>((resolve) => { claimReached = resolve; });
    const allowClaimPromise = new Promise<void>((resolve) => { allowClaim = resolve; });
    const racingPrisma = pauseSessionClaim(prisma, claimReached, allowClaimPromise);
    const racingAuth = new AuthService(
      racingPrisma,
      passwordHasher,
      new LoginRateLimiterService(environment),
      environment,
    );
    const pendingCurrentUser = racingAuth.currentUser(racingLogin.rawSessionToken);
    await claimReachedPromise;
    const racingLogoutRequestId = randomUUID(); auditRequestIds.push(racingLogoutRequestId);
    await authService.logout(racingLogin.rawSessionToken, racingLogoutRequestId);
    allowClaim();
    assert.equal(await pendingCurrentUser, null, "concurrent logout must win over stale session read");
    assert.equal(await authService.currentSession(racingLogin.rawSessionToken), null);
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: racingLogoutRequestId, eventType: "AUTH_LOGOUT" } }), 1);

    const expiringLogin = await normalLogin(authService, email, randomUUID());
    await prisma.userSession.update({
      where: { tokenHash: hashSessionToken(expiringLogin.rawSessionToken) },
      data: {
        createdAt: new Date(Date.now() - 2_000),
        expiresAt: new Date(Date.now() - 1_000),
      },
    });
    assert.equal(await authService.currentUser(expiringLogin.rawSessionToken), null, "expired session is rejected");

    const revokedLogin = await normalLogin(authService, email, randomUUID());
    await prisma.userSession.update({
      where: { tokenHash: hashSessionToken(revokedLogin.rawSessionToken) },
      data: { revokedAt: new Date() },
    });
    assert.equal(await authService.currentUser(revokedLogin.rawSessionToken), null, "revoked session is rejected");

    const disabledLogin = await normalLogin(authService, email, randomUUID());
    await prisma.user.update({ where: { id: userId }, data: { status: "DISABLED" } });
    assert.equal(await authService.currentUser(disabledLogin.rawSessionToken), null, "disabled user session is rejected");
    await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });

    await authService.logout(login.rawSessionToken, randomUUID());
    assert.equal(await authService.currentUser(login.rawSessionToken), null, "logout revokes subsequent authentication");
    const actorEvents = await prisma.securityAuditEvent.findMany({
      where: { actorUserId: userId },
      select: { eventType: true, targetId: true },
    });
    assert.equal(actorEvents.filter((event) => event.eventType === "AUTH_LOGIN_SUCCEEDED").length, 7);
    assert.equal(actorEvents.filter((event) => event.eventType === "AUTH_LOGOUT").length, 3);
    assert.equal(actorEvents.some((event) => event.targetId === tokenHash), false,
      "audit references may not contain the bearer token hash");

    const resetRequestId = randomUUID(); auditRequestIds.push(resetRequestId);
    const resetLinks: string[] = [];
    const passwordRecovery = new PasswordRecoveryService(
      prisma as unknown as PrismaService,
      passwordHasher,
      new LoginRateLimiterService(environment),
      { send: async (_to, url) => { resetLinks.push(url); return true; } },
      environment,
    );
    const genericKnown = await passwordRecovery.request({ email }, "198.51.100.20", resetRequestId);
    const genericUnknown = await passwordRecovery.request({ email: "not-found@example.invalid" }, "198.51.100.21", randomUUID());
    assert.deepEqual(genericKnown, genericUnknown, "reset request response must not disclose account existence");
    const expiredRawToken = new URL(resetLinks[resetLinks.length - 1]!).hash.slice("#token=".length);
    const expiredTokenHash = hashSessionToken(expiredRawToken);
    await prisma.passwordResetToken.update({ where: { tokenHash: expiredTokenHash }, data: { createdAt: new Date(Date.now() - 2_000), expiresAt: new Date(Date.now() - 1_000) } });
    const expiredAttemptId = randomUUID(); auditRequestIds.push(expiredAttemptId);
    await assert.rejects(passwordRecovery.complete({ token: expiredRawToken, password: "new-integration-password" }, "198.51.100.22", expiredAttemptId),
      (error: { status?: number }) => error.status === 401, "expired reset tokens must be rejected");

    const preResetLogin = await normalLogin(authService, email, randomUUID());
    const activeResetRequestId = randomUUID(); auditRequestIds.push(activeResetRequestId);
    await passwordRecovery.request({ email }, "198.51.100.23", activeResetRequestId);
    const rawResetToken = new URL(resetLinks[resetLinks.length - 1]!).hash.slice("#token=".length);
    const resetHash = hashSessionToken(rawResetToken);
    const persistedReset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: resetHash } });
    assert.ok(persistedReset, "reset token hash must be persisted");
    assert.equal(JSON.stringify(persistedReset).includes(rawResetToken), false);
    await passwordRecovery.complete({ token: rawResetToken, password: "new-integration-password" }, "198.51.100.24", randomUUID());
    assert.equal(await authService.currentUser(preResetLogin.rawSessionToken), null, "password reset revokes all prior sessions");
    const replayAttemptId = randomUUID(); auditRequestIds.push(replayAttemptId);
    await assert.rejects(passwordRecovery.complete({ token: rawResetToken, password: "another-new-password" }, "198.51.100.25", replayAttemptId),
      (error: { status?: number }) => error.status === 401, "a consumed reset token cannot be replayed");

    const mfaCrypto = new MfaCryptoService(environment);
    const mfaService = new MfaService(prisma as unknown as PrismaService, mfaCrypto, passwordHasher, new LoginRateLimiterService(environment), environment);
    const actor = { authorizationContext: { user: { id: userId, email, fullName: "Isolated Auth Integration User" }, platformRoles: [], memberships: [] } } as never;
    const setup = await mfaService.beginEnrollment(actor, { password: "new-integration-password" }, randomUUID());
    const currentCounter = Math.floor(Date.now() / 30_000);
    const enabled = await mfaService.confirmEnrollment(actor, { code: mfaCrypto.codeAt(setup.secret, currentCounter) }, randomUUID());
    assert.equal(enabled.recoveryCodes.length, 10);
    const recoveryHash = mfaCrypto.recoveryCodeHash(enabled.recoveryCodes[0]!);
    const storedRecovery = await prisma.mfaRecoveryCode.findUnique({ where: { userId_codeHash: { userId, codeHash: recoveryHash } } });
    assert.ok(storedRecovery);
    assert.equal(JSON.stringify(storedRecovery).includes(enabled.recoveryCodes[0]!), false);
    const beforeMfaLogin = await prisma.userSession.count({ where: { userId } });
    const mfaLogin = await authService.login({ email, password: "new-integration-password" }, "127.0.0.1", randomUUID());
    assert.equal("mfaRequired" in mfaLogin, true);
    assert.equal(await prisma.userSession.count({ where: { userId } }), beforeMfaLogin, "password alone must not create an authenticated session");
    const challengeResult = await mfaService.challenge((mfaLogin as { rawChallengeToken: string }).rawChallengeToken, { code: enabled.recoveryCodes[0] }, randomUUID());
    assert.equal(await authService.currentUser(challengeResult.rawSessionToken) !== null, true, "a valid recovery code completes MFA login");
    const replayChallenge = await authService.login({ email, password: "new-integration-password" }, "127.0.0.1", randomUUID());
    await assert.rejects(mfaService.challenge((replayChallenge as { rawChallengeToken: string }).rawChallengeToken, { code: enabled.recoveryCodes[0] }, randomUUID()),
      (error: { status?: number }) => error.status === 401, "a recovery code is single-use");
  } finally {
    await app?.close().catch(() => undefined);
    if (userCreated) {
      await prisma.$transaction(async (transaction) => {
        await transaction.securityAuditEvent.deleteMany({ where: { actorUserId: userId } });
        if (auditRequestIds.length) {
          await transaction.securityAuditEvent.deleteMany({ where: { requestId: { in: auditRequestIds } } });
        }
        await transaction.userSession.deleteMany({ where: { userId } });
        await transaction.mfaRecoveryCode.deleteMany({ where: { userId } });
        await transaction.loginMfaChallenge.deleteMany({ where: { userId } });
        await transaction.userMfa.deleteMany({ where: { userId } });
        await transaction.passwordResetToken.deleteMany({ where: { userId } });
        await transaction.user.deleteMany({ where: { id: userId } });
      });
    }
    await prisma.$disconnect();
  }
});

async function normalLogin(service: AuthService, email: string, requestId: string): Promise<LoginResult> {
  const result = await service.login({ email, password: "integration-test-password" }, "127.0.0.1", requestId);
  assert.equal("mfaRequired" in result, false, "integration identity is not enrolled in MFA");
  return result as LoginResult;
}

type TransactionFault = (transaction: Prisma.TransactionClient) => Promise<void>;

function withTransactionFault(prisma: PrismaClient, fault: TransactionFault): PrismaService {
  const proxy = new Proxy(prisma, {
    get(target, property) {
      if (property === "$transaction") {
        return (callback: (transaction: Prisma.TransactionClient) => Promise<unknown>) =>
          target.$transaction((transaction) => callback(new Proxy(transaction, {
            get(transactionTarget, transactionProperty) {
              if (transactionProperty === "securityAuditEvent") {
                const delegate = transactionTarget.securityAuditEvent;
                return new Proxy(delegate, {
                  get(delegateTarget, delegateProperty) {
                    if (delegateProperty === "create") {
                      return async (...args: Parameters<typeof delegateTarget.create>) => {
                        await fault(transactionTarget);
                        return delegateTarget.create(...args);
                      };
                    }
                    const value = Reflect.get(delegateTarget, delegateProperty, delegateTarget);
                    return typeof value === "function" ? value.bind(delegateTarget) : value;
                  },
                });
              }
              const value = Reflect.get(transactionTarget, transactionProperty, transactionTarget);
              return typeof value === "function" ? value.bind(transactionTarget) : value;
            },
          })));
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return proxy as unknown as PrismaService;
}

function pauseSessionClaim(
  prisma: PrismaClient,
  onReached: () => void,
  release: Promise<void>,
): PrismaService {
  const proxy = new Proxy(prisma, {
    get(target, property) {
      if (property === "userSession") {
        const delegate = target.userSession;
        return new Proxy(delegate, {
          get(delegateTarget, delegateProperty) {
            if (delegateProperty === "updateMany") {
              return async (...args: Parameters<typeof delegateTarget.updateMany>) => {
                onReached();
                await release;
                return delegateTarget.updateMany(...args);
              };
            }
            const value = Reflect.get(delegateTarget, delegateProperty, delegateTarget);
            return typeof value === "function" ? value.bind(delegateTarget) : value;
          },
        });
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return proxy as unknown as PrismaService;
}
