import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AuthorizationContextService } from "../src/authorization/authorization-context.service";
import { AuthorizationService } from "../src/authorization/authorization.service";
import { Permission } from "../src/authorization/permissions";
import { IndividualPracticeService } from "../src/workspaces/individual-practice.service";
import { IndividualPracticeModule } from "../src/workspaces/individual-practice.module";
import { AuthModule } from "../src/auth/auth.module";
import { AUTH_ENVIRONMENT } from "../src/auth/auth.types";
import { sessionCookieName } from "../src/auth/session-cookie";
import { parseIdempotencyKey, parseIndividualPractice } from "../src/workspaces/individual-practice.dto";
import { PrismaService } from "../src/database/prisma.service";

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (databaseUrl && new URL(databaseUrl).pathname.slice(1) !== "jurismind_auth_test") {
  throw new Error("Safety stop: individual-practice integration tests require jurismind_auth_test.");
}

test("individual practice provisioning is authenticated, atomic, idempotent, and isolated in PostgreSQL", {
  skip: !databaseUrl ? "Set AUTH_TEST_DATABASE_URL to the dedicated jurismind_auth_test database." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const userId = randomUUID();
  const sessionId = randomUUID();
  const otherUserId = randomUUID();
  const firmId = randomUUID();
  const foreignWorkspaceId = randomUUID();
  const firmSlug = `phase7-firm-${randomUUID()}`;
  const foreignSlug = `phase7-foreign-${randomUUID()}`;
  const email = `phase7-${randomUUID()}@example.invalid`;
  const rawToken = randomBytes(32).toString("base64url");
  const requestIds: string[] = [];
  const triggerNames: string[] = [];
  let app: INestApplication | undefined;

  const installRejectingTrigger = async (trigger: string, fn: string, predicate: string) => {
    await prisma.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${predicate} THEN RAISE EXCEPTION 'phase7 injected failure'; END IF; RETURN NEW; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON ${trigger === "phase7_profile_failure" ? "lawyer_profiles" : "security_audit_events"} FOR EACH ROW EXECUTE FUNCTION ${fn}()`);
    triggerNames.push(trigger);
  };

  try {
    await prisma.$connect();
    const [{ name }] = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    assert.equal(name, "jurismind_auth_test", "tests may never use jurismind_dev");
    await prisma.$transaction(async (tx) => {
      await tx.user.createMany({ data: [
        { id: userId, email, emailNormalized: email, fullName: "Phase 7 Provisioning User", passwordHash: "$argon2id$test-placeholder" },
        { id: otherUserId, email: `other-${email}`, emailNormalized: `other-${email}`, fullName: "Other User", passwordHash: "$argon2id$test-placeholder" },
      ] });
      await tx.userSession.create({ data: { id: sessionId, userId,
        tokenHash: createHash("sha256").update(rawToken).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
      await tx.practiceWorkspace.create({ data: { id: firmId, name: "Existing Firm", slug: firmSlug, kind: "FIRM" } });
      await tx.practiceWorkspace.create({ data: { id: foreignWorkspaceId, name: "Other User Firm", slug: foreignSlug, kind: "FIRM" } });
      await tx.practiceMembership.create({ data: { workspaceId: firmId, userId, role: "LAWYER", status: "ACTIVE" } });
      await tx.practiceMembership.create({ data: { workspaceId: foreignWorkspaceId, userId: otherUserId, role: "LAWYER", status: "ACTIVE" } });
    });

    assert.deepEqual(parseIndividualPractice({ name: "  Practice Name  " }), { name: "Practice Name" });
    assert.throws(() => parseIndividualPractice({ name: "A", userId }), BadRequestException,
      "forged identity fields are rejected");
    assert.throws(() => parseIndividualPractice({ name: "A", role: "SUPER_ADMIN" }), BadRequestException,
      "forged role and platform privilege fields are rejected");
    assert.throws(() => parseIndividualPractice({ name: "  " }), BadRequestException);
    assert.throws(() => parseIdempotencyKey(undefined), BadRequestException);

    const service = new IndividualPracticeService(prisma as unknown as PrismaService);
    const environment = { nodeEnv: "development" as const, trustedOrigins: ["http://localhost:3000"],
      sessionTtlSeconds: 3600, passwordMinLength: 12, loginRateLimitMax: 5,
      loginRateLimitWindowSeconds: 900, invitationDevTokenDelivery: false };
    const testingModule = await Test.createTestingModule({ imports: [AuthModule, IndividualPracticeModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .overrideProvider(AUTH_ENVIRONMENT).useValue(environment)
      .compile();
    app = testingModule.createNestApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    assert.ok(address && typeof address !== "string");
    const endpoint = `http://127.0.0.1:${address.port}/api/workspaces/individual-practice`;
    const cookie = `${sessionCookieName(environment)}=${rawToken}`;
    const key = `phase7-${randomUUID()}`;
    const requestId = randomUUID(); requestIds.push(key, requestId);
    const unauthorized = await fetch(endpoint, { method: "POST", headers: { origin: "http://localhost:3000",
      "content-type": "application/json", "idempotency-key": `unauth-${randomUUID()}` },
      body: JSON.stringify({ name: "Unauthenticated" }) });
    assert.equal(unauthorized.status, 401, "the route rejects unauthenticated requests");
    const forged = await fetch(endpoint, { method: "POST", headers: { origin: "http://localhost:3000", cookie,
      "content-type": "application/json", "idempotency-key": `forged-${randomUUID()}` },
      body: JSON.stringify({ name: "Forged Practice", userId: otherUserId, role: "SUPER_ADMIN" }) });
    assert.equal(forged.status, 400, "client-supplied identity and privilege fields are rejected");
    const response = await fetch(endpoint, { method: "POST", headers: { origin: "http://localhost:3000", cookie,
      "content-type": "application/json", "idempotency-key": key, "x-request-id": requestId },
      body: JSON.stringify({ name: "My Legal Practice" }) });
    assert.equal(response.status, 201);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
    const created = await response.json() as Awaited<ReturnType<IndividualPracticeService["provision"]>>;
    const workspaceResponse = await fetch("http://127.0.0.1:" + address.port + "/api/workspaces", {
      headers: { cookie },
    });
    assert.equal(workspaceResponse.status, 200, "workspace discovery works through the authenticated API");
    assert.match(workspaceResponse.headers.get("cache-control") ?? "", /no-store/i);
    const visibleWorkspaces = await workspaceResponse.json() as Array<{ id: string; kind: string; role: string; permissions: string[] }>;
    assert.deepEqual(visibleWorkspaces.map(({ id }) => id).sort(), [firmId, created.workspace.id].sort());
    assert.equal(visibleWorkspaces.some(({ id }) => id === foreignWorkspaceId), false,
      "workspace discovery does not expose another user's membership");
    assert.equal(visibleWorkspaces.find(({ id }) => id === created.workspace.id)?.kind, "INDIVIDUAL");
    assert.equal(visibleWorkspaces.find(({ id }) => id === created.workspace.id)?.role, "LAWYER");
    assert.equal(visibleWorkspaces.find(({ id }) => id === created.workspace.id)?.permissions.includes("matter:access:lawyer-private"), false);
    assert.equal(created.workspace.kind, "INDIVIDUAL");
    assert.equal(created.workspace.name, "My Legal Practice");
    assert.equal(created.membership.role, "LAWYER");
    assert.equal(created.membership.status, "ACTIVE");
    assert.equal(created.lawyerProfile.isPrimary, true);
    assert.equal(await prisma.lawyerProfile.count({ where: { workspaceId: created.workspace.id, isPrimary: true } }), 1);
    assert.equal(await prisma.platformRoleGrant.count({ where: { userId } }), 0, "no Super Admin grant is created");
    assert.equal(await prisma.practiceWorkspace.count({ where: { id: created.workspace.id, kind: "FIRM" } }), 0,
      "provisioning does not create a firm");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: key, actorUserId: userId,
      workspaceId: created.workspace.id, eventType: "INDIVIDUAL_PRACTICE_PROVISIONED" } }), 1);
    const provisioningAudit = await prisma.securityAuditEvent.findFirstOrThrow({ where: { requestId: key } });
    assert.equal(JSON.stringify(provisioningAudit.metadata).includes("My Legal Practice"), false,
      "audit metadata stores only a name fingerprint, not the workspace name");
    assert.equal(await prisma.practiceMembership.count({ where: { userId, workspaceId: firmId } }), 1,
      "provisioning leaves the user's unrelated firm membership unchanged");
    const contexts = new AuthorizationContextService(prisma as unknown as PrismaService);
    const accessContext = await contexts.resolveForUser(userId);
    assert.ok(accessContext);
    assert.equal(new AuthorizationService().hasPermission(accessContext, Permission.AccessLawyerPrivateResources, created.workspace.id), false,
      "provisioning does not grant matter access");

    const invalidWorkspaceId = randomUUID();
    await assert.rejects(prisma.$transaction(async (tx) => {
      await tx.practiceWorkspace.create({ data: { id: invalidWorkspaceId, name: "Invalid Multiple Primary", slug: `phase7-invalid-${randomUUID()}`, kind: "INDIVIDUAL" } });
      const firstId = randomUUID(); const secondId = randomUUID();
      await tx.practiceMembership.createMany({ data: [
        { id: firstId, workspaceId: invalidWorkspaceId, userId, role: "LAWYER", status: "ACTIVE" },
        { id: secondId, workspaceId: invalidWorkspaceId, userId: otherUserId, role: "LAWYER", status: "ACTIVE" },
      ] });
      await tx.lawyerProfile.createMany({ data: [
        { workspaceId: invalidWorkspaceId, membershipId: firstId, isPrimary: true },
        { workspaceId: invalidWorkspaceId, membershipId: secondId, isPrimary: true },
      ] });
    }), "database constraint trigger must reject multiple active lawyers/primary profiles");
    assert.equal(await prisma.practiceWorkspace.count({ where: { id: invalidWorkspaceId } }), 0,
      "failed constraint transaction leaves no workspace behind");

    const concurrentKey = `phase7-concurrent-${randomUUID()}`;
    const [parallelA, parallelB] = await Promise.all([
      service.provision(userId, sessionId, "Concurrent Practice", concurrentKey, randomUUID()),
      service.provision(userId, sessionId, "Concurrent Practice", concurrentKey, randomUUID()),
    ]);
    assert.equal(parallelA.workspace.id, parallelB.workspace.id, "same key replays the same workspace");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: concurrentKey,
      eventType: "INDIVIDUAL_PRACTICE_PROVISIONED" } }), 1);
    await assert.rejects(service.provision(userId, sessionId, "Different Name", concurrentKey, randomUUID()), ConflictException,
      "same key cannot be reused for a different payload");

    const separateKey = `phase7-separate-${randomUUID()}`;
    const separate = await service.provision(userId, sessionId, "Second Practice", separateKey, randomUUID());
    assert.notEqual(separate.workspace.id, created.workspace.id,
      "the current product rules allow multiple individual practices; distinct keys intentionally create distinct practices");

    await assert.rejects(service.provision(otherUserId, randomUUID(), "No Session", `phase7-no-session-${randomUUID()}`, randomUUID()),
      UnauthorizedException, "an unverified session cannot provision");

    const beforeProfileFailure = await prisma.practiceWorkspace.count({ where: { kind: "INDIVIDUAL", name: "Fail Profile" } });
    await installRejectingTrigger("phase7_profile_failure", "phase7_reject_profile", "NEW.display_title IS NULL");
    await assert.rejects(service.provision(userId, sessionId, "Fail Profile", `phase7-profile-fail-${randomUUID()}`, randomUUID()));
    await prisma.$executeRawUnsafe("DROP TRIGGER phase7_profile_failure ON lawyer_profiles");
    await prisma.$executeRawUnsafe("DROP FUNCTION phase7_reject_profile()");
    triggerNames.splice(triggerNames.indexOf("phase7_profile_failure"), 1);
    assert.equal(await prisma.practiceWorkspace.count({ where: { kind: "INDIVIDUAL", name: "Fail Profile" } }), beforeProfileFailure,
      "profile failure rolls back workspace and membership");

    const auditKey = `phase7-audit-fail-${randomUUID()}`;
    await installRejectingTrigger("phase7_audit_failure", "phase7_reject_audit", "NEW.event_type = 'INDIVIDUAL_PRACTICE_PROVISIONED'");
    await assert.rejects(service.provision(userId, sessionId, "Fail Audit", auditKey, randomUUID()));
    await prisma.$executeRawUnsafe("DROP TRIGGER phase7_audit_failure ON security_audit_events");
    await prisma.$executeRawUnsafe("DROP FUNCTION phase7_reject_audit()");
    triggerNames.splice(triggerNames.indexOf("phase7_audit_failure"), 1);
    assert.equal(await prisma.practiceWorkspace.count({ where: { kind: "INDIVIDUAL", name: "Fail Audit" } }), 0,
      "audit failure rolls back workspace, membership, and profile");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: auditKey } }), 0);

    // No matter model or matter permission is created by provisioning.
    const after = await prisma.practiceMembership.findUniqueOrThrow({ where: { id: created.membership.id } });
    assert.equal(after.workspaceId, created.workspace.id);
    await prisma.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    await assert.rejects(service.provision(userId, sessionId, "My Legal Practice", key, randomUUID()), UnauthorizedException,
      "an idempotent replay still requires a currently valid session");
  } finally {
    await app?.close().catch(() => undefined);
    for (const trigger of triggerNames) {
      const isProfile = trigger === "phase7_profile_failure";
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON ${isProfile ? "lawyer_profiles" : "security_audit_events"}`).catch(() => undefined);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${isProfile ? "phase7_reject_profile" : "phase7_reject_audit"}()`).catch(() => undefined);
    }
    const created = await prisma.practiceMembership.findMany({ where: { userId }, select: { workspaceId: true } }).catch(() => []);
    const workspaceIds = [...new Set([firmId, foreignWorkspaceId, ...created.map((row) => row.workspaceId)])];
    await prisma.$transaction(async (tx) => {
      await tx.securityAuditEvent.deleteMany({ where: { OR: [
        { requestId: { in: requestIds } }, { actorUserId: userId }, { workspaceId: { in: workspaceIds } },
      ] } });
      await tx.lawyerProfile.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
      await tx.practiceMembership.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
      await tx.userSession.deleteMany({ where: { userId } });
      await tx.practiceWorkspace.deleteMany({ where: { id: { in: workspaceIds } } });
      await tx.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
