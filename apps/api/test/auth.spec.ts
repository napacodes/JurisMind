import assert from "node:assert/strict";
import { afterEach, before, beforeEach, test } from "node:test";
import { randomBytes } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AuthModule } from "../src/auth/auth.module";
import { sessionCookieName } from "../src/auth/auth.controller";
import { CsrfOriginGuard } from "../src/auth/csrf-origin.guard";
import { PasswordHasherService } from "../src/auth/password-hasher.service";
import { PasswordRecoveryService } from "../src/auth/password-recovery.service";
import { ConfiguredPasswordResetDelivery } from "../src/auth/password-reset-delivery";
import { LoginRateLimiterService } from "../src/auth/login-rate-limiter.service";
import { AuthService, hashSessionToken } from "../src/auth/auth.service";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "../src/auth/auth.types";
import { PrismaService } from "../src/database/prisma.service";
import { configureCors } from "../src/config/cors";

const origin = "https://app.jurismind.example";
const environment: AuthEnvironment = {
  nodeEnv: "production",
  trustedOrigins: [origin],
  sessionTtlSeconds: 3_600,
  passwordMinLength: 12,
  loginRateLimitMax: 2,
  loginRateLimitWindowSeconds: 900,
  invitationDevTokenDelivery: false,
  mfaEncryptionKey: Buffer.alloc(32, 1),
  publicWebUrl: origin,
  passwordResetEmailEndpoint: null,
  passwordResetEmailApiKey: null,
  passwordResetEmailFrom: null,
};
const email = "lawyer@example.invalid";
const password = "correct-horse-battery-staple";
const passwordHasher = new PasswordHasherService();
let passwordHash: string;

interface FakeUser {
  id: string;
  email: string;
  emailNormalized: string;
  fullName: string;
  passwordHash: string | null;
  status: "ACTIVE" | "DISABLED";
}

interface FakeSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date | null;
}

class FakePrisma {
  authorizationLookups = 0;
  readonly users: FakeUser[] = [{
    id: "user-test-1",
    email,
    emailNormalized: email,
    fullName: "Sample Lawyer",
    passwordHash,
    status: "ACTIVE",
  }];
  readonly sessions = new Map<string, FakeSession>();
  mfaEnabled = false;
  readonly challenges: Array<Record<string, unknown>> = [];
  readonly auditEvents: Array<Record<string, unknown>> = [];
  readonly user = {
    findUnique: async ({ where }: { where: { emailNormalized: string } }) =>
      this.users.find((user) => user.emailNormalized === where.emailNormalized) ?? null,
    findFirst: async ({ where }: { where: { id: string; status: "ACTIVE" } }) => {
      this.authorizationLookups += 1;
      const user = this.users.find((item) => item.id === where.id && item.status === where.status);
      return user ? { ...user, memberships: [], platformRoleGrants: [] } : null;
    },
  };
  readonly userMfa = { findUnique: async () => this.mfaEnabled ? { enabledAt: new Date(), secretCiphertext: "ciphertext" } : null };
  readonly loginMfaChallenge = { create: async ({ data }: { data: Record<string, unknown> }) => { this.challenges.push(data); return data; } };
  readonly userSession = {
    create: async ({ data }: { data: { id: string; userId: string; tokenHash: string; expiresAt: Date } }) => {
      const session: FakeSession = { ...data, revokedAt: null, lastSeenAt: null };
      this.sessions.set(session.tokenHash, session);
      return session;
    },
    findUnique: async ({ where, include, select }: {
      where: { tokenHash: string };
      include?: { user: boolean };
      select?: Record<string, boolean>;
    }) => {
      const session = this.sessions.get(where.tokenHash);
      if (!session) return null;
      if (select) return { id: session.id, userId: session.userId, revokedAt: session.revokedAt };
      if (include?.user) {
        return { ...session, user: this.users.find((user) => user.id === session.userId)! };
      }
      return session;
    },
    updateMany: async ({ where, data }: {
      where: { id: string; revokedAt?: null; expiresAt?: { gt: Date }; user?: { is: { status: "ACTIVE" } } };
      data: { revokedAt?: Date; lastSeenAt?: Date };
    }) => {
      const session = [...this.sessions.values()].find((item) => item.id === where.id);
      if (!session || (where.revokedAt === null && session.revokedAt !== null)) return { count: 0 };
      if (where.expiresAt && session.expiresAt <= where.expiresAt.gt) return { count: 0 };
      if (where.user && this.users.find((user) => user.id === session.userId)?.status !== where.user.is.status) return { count: 0 };
      if (data.revokedAt) session.revokedAt = data.revokedAt;
      if (data.lastSeenAt) session.lastSeenAt = data.lastSeenAt;
      return { count: 1 };
    },
    update: async ({ where, data }: { where: { id: string }; data: { lastSeenAt: Date } }) => {
      const session = [...this.sessions.values()].find((item) => item.id === where.id);
      if (!session) throw new Error("Missing fake session");
      session.lastSeenAt = data.lastSeenAt;
      return session;
    },
  };
  readonly securityAuditEvent = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      this.auditEvents.push(data);
      return data;
    },
  };
  readonly $transaction = async <T>(callback: (transaction: this) => Promise<T>): Promise<T> => callback(this);
}

let app: INestApplication;
let database: FakePrisma;
let baseUrl: string;

before(async () => {
  passwordHash = await passwordHasher.hash(password, environment.passwordMinLength);
});

beforeEach(async () => {
  database = new FakePrisma();
  const module = await Test.createTestingModule({ imports: [AuthModule] })
    .overrideProvider(PrismaService).useValue(database)
    .overrideProvider(AUTH_ENVIRONMENT).useValue(environment)
    .compile();
  app = module.createNestApplication({ logger: false });
  configureCors(app, environment.trustedOrigins);
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  if (app) await app.close();
});

test("password hashing uses Argon2id and verifies only the correct password", async () => {
  const encoded = await passwordHasher.hash(password, environment.passwordMinLength);
  assert.match(encoded, /^\$argon2id\$/);
  assert.equal(await passwordHasher.verify(password, encoded), true);
  assert.equal(await passwordHasher.verify("wrong-password", encoded), false);
  await assert.rejects(passwordHasher.hash("short", environment.passwordMinLength));
});

test("MFA-enrolled password login creates only a challenge, never a session", async () => {
  database = new FakePrisma();
  database.mfaEnabled = true;
  const authService = new AuthService(database as never, passwordHasher, new LoginRateLimiterService(environment), environment);
  const outcome = await authService.login({ email, password }, "127.0.0.1", "mfa-test");
  assert.equal("mfaRequired" in outcome, true);
  assert.equal(database.sessions.size, 0);
  assert.equal(database.challenges.length, 1);
  const challenge = outcome as { rawChallengeToken: string };
  assert.equal(database.challenges[0]?.tokenHash, hashSessionToken(challenge.rawChallengeToken));
  assert.equal(JSON.stringify(database.challenges).includes(challenge.rawChallengeToken), false);
});

test("password-reset requests return the same generic message when delivery is unconfigured", async () => {
  const fake = new FakePrisma();
  const recovery = new PasswordRecoveryService(fake as never, passwordHasher, new LoginRateLimiterService(environment), { send: async () => false }, environment);
  const known = await recovery.request({ email }, "198.51.100.10", "reset-known");
  const unknown = await recovery.request({ email: "unknown@example.invalid" }, "198.51.100.11", "reset-unknown");
  assert.deepEqual(known, unknown);
  assert.deepEqual(known, { message: "If an eligible account exists, password reset instructions will be sent." });
  assert.equal(fake.challenges.length, 0);
});

test("development reset sink captures links in memory and drains them once", async () => {
  const sink = new ConfiguredPasswordResetDelivery({
    ...environment,
    nodeEnv: "development",
    localPasswordResetSinkEnabled: true,
    localPasswordResetSinkKey: "test-only-key-with-at-least-32-bytes",
  });
  const expiresAt = new Date("2030-01-01T00:00:00.000Z");
  assert.equal(await sink.send("browser-test@example.invalid", "http://localhost:3000/reset#token=synthetic", expiresAt), true);
  const captured = sink.drainCaptured();
  assert.equal(captured.length, 1);
  assert.equal(captured[0]?.to, "browser-test@example.invalid");
  assert.equal(captured[0]?.resetUrl, "http://localhost:3000/reset#token=synthetic");
  assert.equal(captured[0]?.expiresAt, expiresAt.toISOString());
  assert.deepEqual(sink.drainCaptured(), []);
});

test("login issues a Secure HttpOnly host cookie and persists only the token hash", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json() as { user: Record<string, unknown>; expiresAt: string };
  assert.deepEqual(payload.user, { id: "user-test-1", email, fullName: "Sample Lawyer" });
  assert.equal("passwordHash" in payload.user, false);

  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  assert.match(setCookie, /^__Host-jurismind_session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Path=\//i);
  assert.doesNotMatch(setCookie, /Domain=/i);
  const cookieExpiry = setCookie.match(/Expires=([^;]+)/i)?.[1];
  assert.ok(cookieExpiry, "session cookie has an explicit expiry");
  assert.ok(Math.abs(new Date(cookieExpiry).getTime() - new Date(payload.expiresAt).getTime()) < 1_000);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  const token = cookieValue(setCookie);
  assert.equal(token.length, 43);
  assert.equal(database.sessions.size, 1);
  const stored = [...database.sessions.values()][0];
  assert.ok(stored);
  assert.notEqual(stored.tokenHash, token);
  assert.match(stored.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(stored).includes(token), false);
  assert.equal(database.auditEvents[0]?.eventType, "AUTH_LOGIN_SUCCEEDED");
  assert.equal(JSON.stringify(database.auditEvents).includes(token), false);

  const current = await request("/api/auth/me?role=SUPER_ADMIN&workspaceId=workspace-foreign", {
    headers: { cookie: `__Host-jurismind_session=${token}` },
  });
  const currentBody = await current.text();
  assert.equal(current.status, 200, currentBody);
  assert.deepEqual(JSON.parse(currentBody), {
    user: { id: "user-test-1", email, fullName: "Sample Lawyer" }, platformRoles: [],
  });
});

test("invalid and unknown credentials return the same generic response and are audited", async () => {
  const known = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password: "incorrect-password" }),
  });
  const unknown = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email: "unknown@example.invalid", password }),
  });
  assert.equal(known.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(await known.json(), await unknown.json());
  assert.equal(database.auditEvents.filter((event) => event.eventType === "AUTH_LOGIN_FAILED").length, 2);

  database.users[0]!.passwordHash = null;
  const nullHashAccount = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password: "jurismind-invalid-account-dummy-password" }),
  });
  assert.equal(nullHashAccount.status, 401);
  assert.equal(database.sessions.size, 0);
});

test("current-user rejects malformed, unknown, expired, revoked, and inactive-account sessions", async () => {
  const malformed = await request("/api/auth/me", { headers: { cookie: "__Host-jurismind_session=bad" } });
  assert.equal(malformed.status, 401);

  const unknownToken = randomBytes(32).toString("base64url");
  const unknown = await request("/api/auth/me", { headers: { cookie: `__Host-jurismind_session=${unknownToken}` } });
  assert.equal(unknown.status, 401);
  assert.equal(database.authorizationLookups, 0, "unauthenticated requests stop before role resolution");

  const token = await loginAndGetToken();
  const record = [...database.sessions.values()][0]!;
  record.expiresAt = new Date(Date.now() - 1_000);
  const expired = await request("/api/auth/me", { headers: { cookie: `__Host-jurismind_session=${token}` } });
  assert.equal(expired.status, 401);
  assert.ok(record.revokedAt);

  const freshToken = await loginAndGetToken();
  const freshRecord = [...database.sessions.values()].find((session) => session.tokenHash !== record.tokenHash)!;
  freshRecord.revokedAt = new Date();
  const revoked = await request("/api/auth/me", { headers: { cookie: `__Host-jurismind_session=${freshToken}` } });
  assert.equal(revoked.status, 401);

  const inactiveToken = await loginAndGetToken();
  const inactiveSession = [...database.sessions.values()].find((session) => session.tokenHash !== record.tokenHash && session.tokenHash !== freshRecord.tokenHash)!;
  database.users[0]!.status = "DISABLED";
  const inactive = await request("/api/auth/me", { headers: { cookie: `__Host-jurismind_session=${inactiveToken}` } });
  assert.equal(inactive.status, 401);
  assert.ok(inactiveSession.revokedAt);
});

test("logout revokes the server session and clears the cookie", async () => {
  const token = await loginAndGetToken();
  const logout = await request("/api/auth/logout", {
    method: "POST",
    headers: { origin, cookie: `__Host-jurismind_session=${token}` },
  });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get("set-cookie") ?? "", /Expires=Thu, 01 Jan 1970/i);
  assert.ok([...database.sessions.values()][0]?.revokedAt);
  assert.equal(database.auditEvents[database.auditEvents.length - 1]?.eventType, "AUTH_LOGOUT");
  const current = await request("/api/auth/me", { headers: { cookie: `__Host-jurismind_session=${token}` } });
  assert.equal(current.status, 401);
});

test("cookie-authenticated state changes require an exact trusted Origin", async () => {
  const noOrigin = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const wrongOrigin = await request("/api/auth/logout", {
    method: "POST",
    headers: { origin: "https://attacker.example" },
  });
  assert.equal(noOrigin.status, 403);
  assert.equal(wrongOrigin.status, 403);
  assert.equal(database.sessions.size, 0);
});

test("login throttling returns a generic failure and records a throttle audit event", async () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email, password: "bad-password" }),
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      statusCode: 401,
      message: "Invalid email or password.",
      error: "Unauthorized",
    });
  }
  assert.equal(database.auditEvents.filter((event) => event.eventType === "AUTH_LOGIN_FAILED").length, 2);
  assert.equal(database.auditEvents.filter((event) => event.eventType === "AUTH_LOGIN_THROTTLED").length, 1);
});

test("login ignores no user-controlled privilege fields and only returns identity", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password, role: "SUPER_ADMIN" }),
  });
  assert.equal(response.status, 401);
  assert.equal(database.sessions.size, 0);
  assert.equal(database.auditEvents.some((event) => event.eventType === "PLATFORM_ROLE_GRANTED"), false);
});

test("trusted-origin policy rejects untrusted and absent origins", () => {
  const guard = new CsrfOriginGuard(environment);
  assert.doesNotThrow(() => guard.assertTrustedOrigin(origin));
  assert.throws(() => guard.assertTrustedOrigin("https://other.example"));
  assert.throws(() => guard.assertTrustedOrigin(undefined));
  assert.equal(sessionCookieName(environment), "__Host-jurismind_session");
});

test("CORS returns credentials only for the configured trusted origin", async () => {
  const trusted = await request("/api/auth/me", {
    method: "OPTIONS",
    headers: {
      origin,
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type,idempotency-key,x-request-id",
    },
  });
  assert.equal(trusted.headers.get("access-control-allow-origin"), origin);
  assert.equal(trusted.headers.get("access-control-allow-credentials"), "true");
  assert.equal(trusted.headers.get("access-control-allow-methods")?.includes("PATCH"), true);
  const allowedHeaders = trusted.headers.get("access-control-allow-headers")?.toLowerCase() ?? "";
  assert.match(allowedHeaders, /idempotency-key/);
  assert.match(allowedHeaders, /x-request-id/);

  const untrusted = await request("/api/auth/me", {
    method: "OPTIONS",
    headers: {
      origin: "https://attacker.example",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });
  assert.equal(untrusted.headers.get("access-control-allow-origin"), null);
});

async function loginAndGetToken(): Promise<string> {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return cookieValue(response.headers.get("set-cookie") ?? "");
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init);
}

function cookieValue(value: string): string {
  return value.split(";", 1)[0]!.slice(value.indexOf("=") + 1);
}

