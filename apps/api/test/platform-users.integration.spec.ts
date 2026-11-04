import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PlatformAdminModule } from "../src/platform-admin/platform-admin.module";
import { AUTH_ENVIRONMENT } from "../src/auth/auth.types";
import type { AuthEnvironment } from "../src/auth/auth.types";
import { sessionCookieName } from "../src/auth/session-cookie";
import { hashSessionToken } from "../src/auth/auth.service";
import { PasswordHasherService } from "../src/auth/password-hasher.service";
import { configureCors } from "../src/config/cors";
import { PrismaService } from "../src/database/prisma.service";
import { PrivateDocumentStorage } from "../src/lawyer-verification/private-document-storage";

const testDatabaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const parsed = new URL(testDatabaseUrl);
  if (parsed.pathname.slice(1) !== "jurismind_auth_test" || !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("Safety stop: platform-user integration tests require local jurismind_auth_test.");
  }
}

test("platform user administration is Super Admin-only, bounded, audited, and isolated in PostgreSQL", {
  skip: !testDatabaseUrl ? "Set AUTH_TEST_DATABASE_URL to local jurismind_auth_test." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl! }) });
  const environment: AuthEnvironment = {
    nodeEnv: "test", trustedOrigins: ["http://localhost:3000"], sessionTtlSeconds: 3_600,
    passwordMinLength: 12, loginRateLimitMax: 5, loginRateLimitWindowSeconds: 900,
    invitationDevTokenDelivery: false, mfaEncryptionKey: Buffer.alloc(32, 2),
    publicWebUrl: "http://localhost:3000", passwordResetEmailEndpoint: "https://mail.example.invalid/send",
    passwordResetEmailApiKey: "integration-only", passwordResetEmailFrom: "noreply@example.invalid",
  };
  const hasher = new PasswordHasherService();
  const viableAdminHash = await hasher.hash("synthetic-integration-password", environment.passwordMinLength);
  const userIds = Array.from({ length: 7 }, () => randomUUID());
  const [actorId, viableAdminId, firmAdminId, targetId, disabledId] = userIds as [string, string, string, string, string];
  const raceAdminAId = userIds[5]!;
  const raceAdminBId = userIds[6]!;
  const workspaceIds = [randomUUID(), randomUUID()];
  const membershipIds = [randomUUID(), randomUUID(), randomUUID()];
  const sessionIds = Array.from({ length: 6 }, () => randomUUID());
  const sessionUserIds = [actorId, firmAdminId, targetId, disabledId, raceAdminAId, raceAdminBId];
  const tokens = sessionIds.map(() => randomBytes(32).toString("base64url"));
  const emails = userIds.map((_, index) => `platform-admin-test-${index}-${randomUUID()}@example.invalid`);
  // The last-administrator guard counts every viable platform administrator in the database,
  // so assertions must know whether other (for example browser-acceptance) grants exist.
  const viableAdministratorWhere = {
    status: "ACTIVE" as const,
    passwordHash: { not: null },
    platformRoleGrants: { some: { role: "SUPER_ADMIN" as const, revokedAt: null } },
  };
  const requestIds: string[] = [];
  const practiceCreatedUserIds: string[] = [];
  const practiceCreatedWorkspaceIds: string[] = [];
  const profilePhotoKeys: string[] = [];
  let photoStorage: PrivateDocumentStorage | undefined;
  const createdAdminEmail = `new-platform-admin-${randomUUID()}@example.invalid`;
  const functionName = `phase13_fail_audit_${randomUUID().replaceAll("-", "")}`;
  const triggerName = functionName;
  let triggerCreated = false;
  let fixturesCreated = false;
  let app: INestApplication | undefined;
  let baseUrl = "";
  const cookieName = sessionCookieName(environment);
  const origin = environment.trustedOrigins[0]!;

  const request = (path: string, method = "GET", who: number | null = 0, body?: unknown, requestId?: string) => {
    const headers = new Headers({ origin });
    if (who !== null) headers.set("cookie", `${cookieName}=${tokens[who]}`);
    if (body !== undefined && !(body instanceof FormData)) headers.set("content-type", "application/json");
    if (requestId) headers.set("x-request-id", requestId);
    return fetch(`${baseUrl}${path}`, { method, headers, ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) });
  };

  try {
    await prisma.$connect();
    const database = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    assert.equal(database[0]?.name, "jurismind_auth_test", "must never modify jurismind_dev");

    await prisma.$transaction(async (tx) => {
      await tx.user.createMany({ data: userIds.map((id, index) => ({
        id, email: emails[index]!, emailNormalized: emails[index]!,
        fullName: `Synthetic Platform User ${index}`,
        ...(index === 1 ? { passwordHash: viableAdminHash } : {}),
        status: index === 4 ? "DISABLED" as const : "ACTIVE" as const,
      })) });
      await tx.practiceWorkspace.createMany({ data: [
        { id: workspaceIds[0]!, name: "Synthetic Firm A", slug: `platform-a-${randomUUID()}`, kind: "FIRM" },
        { id: workspaceIds[1]!, name: "Synthetic Firm B", slug: `platform-b-${randomUUID()}`, kind: "FIRM" },
      ] });
      await tx.practiceMembership.createMany({ data: [
        { id: membershipIds[0]!, workspaceId: workspaceIds[0]!, userId: firmAdminId, role: "FIRM_ADMIN", status: "ACTIVE", joinedAt: new Date() },
        { id: membershipIds[1]!, workspaceId: workspaceIds[0]!, userId: targetId, role: "LAWYER", status: "ACTIVE", joinedAt: new Date() },
        { id: membershipIds[2]!, workspaceId: workspaceIds[1]!, userId: disabledId, role: "ASSISTANT", status: "SUSPENDED" },
      ] });
      await tx.lawyerProfile.create({ data: { workspaceId: workspaceIds[0]!, membershipId: membershipIds[1]!, isPrimary: false } });
      await tx.platformRoleGrant.createMany({ data: [
        { id: randomUUID(), userId: actorId, role: "SUPER_ADMIN" },
        { id: randomUUID(), userId: viableAdminId, role: "SUPER_ADMIN" },
      ] });
      await tx.userSession.createMany({ data: sessionIds.map((id, index) => ({
        id, userId: sessionUserIds[index]!, tokenHash: hashSessionToken(tokens[index]!),
        audience: index === 0 || index >= 4 ? "ADMINISTRATION" as const : index === 1 ? "FIRM" as const : index === 2 ? "LAWYER" as const : "ASSISTANT" as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        ...(index === 3 ? { revokedAt: new Date() } : {}),
      })) });
    });
    fixturesCreated = true;
    const externalViableAdministrators = await prisma.user.count({
      where: { ...viableAdministratorWhere, id: { notIn: userIds } },
    });

    const testingModule = await Test.createTestingModule({ imports: [PlatformAdminModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .overrideProvider(AUTH_ENVIRONMENT).useValue(environment)
      .compile();
    photoStorage = testingModule.get(PrivateDocumentStorage);
    app = testingModule.createNestApplication({ logger: false });
    configureCors(app, environment.trustedOrigins);
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    assert.ok(address && typeof address !== "string");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const currentIdentityResponse = await request("/api/auth/me");
    assert.equal(currentIdentityResponse.status, 200);
    const currentIdentity = await currentIdentityResponse.json() as { platformRoles: string[] };
    assert.deepEqual(currentIdentity.platformRoles, ["SUPER_ADMIN"], "the UI receives only the actor's own platform roles");

    const query = new URLSearchParams({ search: emails[3]!, role: "LAWYER", status: "ACTIVE", workspaceKind: "FIRM", page: "1", pageSize: "1" });
    const listResponse = await request(`/api/platform-admin/users?${query}`);
    assert.equal(listResponse.status, 200);
    const list = await listResponse.json() as { users: Array<Record<string, unknown>>; pagination: { total: number; pageSize: number } };
    assert.equal(list.pagination.total, 1);
    assert.equal(list.pagination.pageSize, 1);
    assert.equal(list.users[0]?.id, targetId);
    const safeList = JSON.stringify(list);
    for (const forbiddenField of ["passwordHash", "tokenHash", "secretCiphertext", "recoveryCodes", "resetTokens"]) {
      assert.equal(safeList.includes(forbiddenField), false, `list must not return ${forbiddenField}`);
    }

    const detailsResponse = await request(`/api/platform-admin/users/${targetId}`);
    assert.equal(detailsResponse.status, 200);
    const details = await detailsResponse.json() as Record<string, unknown>;
    assert.equal(details.id, targetId);
    assert.equal(details.status, "ACTIVE");
    assert.equal(JSON.stringify(details).includes("passwordHash"), false);
    assert.equal(JSON.stringify(details).includes("tokenHash"), false);

    const createAdminResponse = await request("/api/platform-admin/users", "POST", 0, { fullName: "New Platform Admin", email: createdAdminEmail, password: "safe-password-12345" });
    assert.equal(createAdminResponse.status, 201, "an authorized Super Admin can create another administrator");
    const createdAdmin = await createAdminResponse.json() as { id: string; email: string; platformRoles: string[] };
    assert.equal(createdAdmin.email, createdAdminEmail);
    assert.deepEqual(createdAdmin.platformRoles, ["SUPER_ADMIN"]);
    assert.equal(await prisma.user.count({ where: { emailNormalized: createdAdminEmail } }), 1);
    assert.equal(await prisma.platformRoleGrant.count({ where: { userId: createdAdmin.id, role: "SUPER_ADMIN", revokedAt: null } }), 1);

    const duplicateCreateResponse = await request("/api/platform-admin/users", "POST", 0, { fullName: "Duplicate", email: createdAdminEmail, password: "safe-password-12345" });
    assert.equal(duplicateCreateResponse.status, 409, "duplicate email addresses are rejected");

    const practiceForm = (values: Record<string, string>, withPhoto = false) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(values)) form.set(key, value);
      if (withPhoto) form.set("photo", new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0])], { type: "image/png" }), "profile.png");
      return form;
    };
    const practiceRequest = (values: Record<string, string>, who: number | null = 0, withPhoto = false) => {
      const requestId = randomUUID(); requestIds.push(requestId);
      return request("/api/platform-admin/users/practice-accounts", "POST", who, practiceForm(values, withPhoto), requestId);
    };
    const practiceBase = (suffix: string) => ({
      firstName: "Synthetic", lastName: "Practice", username: `u${randomUUID().replaceAll("-", "").slice(0, 20)}`, email: `practice-${suffix}@example.invalid`,
      countryCode: "DZ", phoneNumber: "+213555123456", password: "synthetic-practice-password", status: "ACTIVE",
    });

    assert.equal((await practiceRequest({ ...practiceBase(`unauth-${randomUUID()}`), accountType: "FIRM", firmName: "Unauthorized Firm" }, null)).status, 401,
      "unauthenticated practice-account creation is rejected");
    assert.equal((await practiceRequest({ ...practiceBase(`denied-${randomUUID()}`), accountType: "FIRM", firmName: "Denied Firm" }, 1)).status, 403,
      "a practice administrator cannot create platform-managed accounts");
    assert.equal((await practiceRequest({ ...practiceBase(`super-${randomUUID()}`), accountType: "SUPER_ADMIN" }, 0)).status, 400,
      "crafted platform-role values are rejected");

    const firmValues = { ...practiceBase(`firm-${randomUUID()}`), accountType: "FIRM", firmName: "Synthetic Created Firm" };
    const firmResponse = await practiceRequest(firmValues, 0, true);
    assert.equal(firmResponse.status, 201, await firmResponse.clone().text());
    const firmCreated = await firmResponse.json() as { id: string; workspaceId: string; membershipId: string; role: string; status: string };
    practiceCreatedUserIds.push(firmCreated.id); practiceCreatedWorkspaceIds.push(firmCreated.workspaceId);
    assert.equal(firmCreated.role, "FIRM_ADMIN");
    assert.equal((await prisma.practiceWorkspace.findUniqueOrThrow({ where: { id: firmCreated.workspaceId } })).kind, "FIRM");
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: firmCreated.membershipId } })).status, "ACTIVE");
    assert.equal(JSON.stringify(firmCreated).includes("passwordHash"), false);
    const firmDbUser = await prisma.user.findUniqueOrThrow({ where: { id: firmCreated.id } });
    assert.ok(firmDbUser.profilePhotoKey);
    profilePhotoKeys.push(firmDbUser.profilePhotoKey!);
    assert.notEqual(firmDbUser.passwordHash, "synthetic-practice-password");
    assert.ok(await hasher.verify("synthetic-practice-password", firmDbUser.passwordHash!));
    const profilePhotoResponse = await request(`/api/platform-admin/users/${firmCreated.id}/profile-photo`);
    assert.equal(profilePhotoResponse.status, 200);
    assert.equal(profilePhotoResponse.headers.get("content-type"), "image/png");
    assert.equal(profilePhotoResponse.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await profilePhotoResponse.arrayBuffer()), Buffer.from([137,80,78,71,13,10,26,10,0]));
    assert.equal((await request(`/api/platform-admin/users/${firmCreated.id}/profile-photo`, "GET", 1)).status, 403,
      "profile photos require Platform Administration permission");

    const individualResponse = await practiceRequest({ ...practiceBase(`individual-${randomUUID()}`), accountType: "LAWYER", workspaceMode: "INDIVIDUAL" });
    assert.equal(individualResponse.status, 201);
    const individualCreated = await individualResponse.json() as { id: string; workspaceId: string; membershipId: string; role: string };
    practiceCreatedUserIds.push(individualCreated.id); practiceCreatedWorkspaceIds.push(individualCreated.workspaceId);
    assert.equal(individualCreated.role, "LAWYER");
    assert.equal((await prisma.practiceWorkspace.findUniqueOrThrow({ where: { id: individualCreated.workspaceId } })).kind, "INDIVIDUAL");
    assert.equal((await prisma.lawyerProfile.findUniqueOrThrow({ where: { membershipId: individualCreated.membershipId } })).isPrimary, true);

    const firmLawyerResponse = await practiceRequest({ ...practiceBase(`firm-lawyer-${randomUUID()}`), accountType: "LAWYER", workspaceMode: "FIRM", workspaceId: workspaceIds[0]! });
    assert.equal(firmLawyerResponse.status, 201);
    const firmLawyerCreated = await firmLawyerResponse.json() as { id: string; workspaceId: string; membershipId: string; role: string };
    practiceCreatedUserIds.push(firmLawyerCreated.id);
    assert.equal(firmLawyerCreated.workspaceId, workspaceIds[0]);
    assert.equal((await prisma.lawyerProfile.findUniqueOrThrow({ where: { membershipId: firmLawyerCreated.membershipId } })).isPrimary, false);

    const assistantResponse = await practiceRequest({ ...practiceBase(`assistant-${randomUUID()}`), accountType: "ASSISTANT", supervisorMembershipId: membershipIds[1]! });
    assert.equal(assistantResponse.status, 201);
    const assistantCreated = await assistantResponse.json() as { id: string; workspaceId: string; membershipId: string; role: string };
    practiceCreatedUserIds.push(assistantCreated.id);
    assert.equal(assistantCreated.workspaceId, workspaceIds[0]);
    assert.equal(assistantCreated.role, "ASSISTANT");
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: assistantCreated.membershipId } })).supervisingLawyerMembershipId, membershipIds[1]);
    assert.equal((await practiceRequest({ ...practiceBase(`cross-workspace-${randomUUID()}`), accountType: "ASSISTANT", workspaceId: workspaceIds[1]!, supervisorMembershipId: membershipIds[1]! })).status, 400,
      "assistant forms cannot submit a conflicting workspace");
    await assert.rejects(prisma.practiceMembership.create({ data: {
      workspaceId: workspaceIds[1]!, userId: targetId, role: "ASSISTANT", status: "ACTIVE", supervisingLawyerMembershipId: membershipIds[1]!,
    } }), "the composite foreign key prevents cross-workspace supervision");
    assert.equal((await practiceRequest({ ...practiceBase(`invalid-dto-${randomUUID()}`), username: "bad username", accountType: "FIRM", firmName: "Invalid" })).status, 400);

    const duplicateEmail = practiceBase(`duplicate-email-${randomUUID()}`);
    const duplicateEmailFirst = await practiceRequest({ ...duplicateEmail, accountType: "FIRM", firmName: "Duplicate email firm" });
    assert.equal(duplicateEmailFirst.status, 201);
    const duplicateEmailUser = await duplicateEmailFirst.json() as { id: string; workspaceId: string };
    practiceCreatedUserIds.push(duplicateEmailUser.id); practiceCreatedWorkspaceIds.push(duplicateEmailUser.workspaceId);
    const duplicateEmailResponse = await practiceRequest({ ...duplicateEmail, username: `u${randomUUID().replaceAll("-", "").slice(0, 20)}`, accountType: "FIRM", firmName: "Should not persist" });
    assert.equal(duplicateEmailResponse.status, 409);
    const duplicateUsernameResponse = await practiceRequest({ ...practiceBase(`email-collision-${randomUUID()}`), username: duplicateEmail.username, accountType: "FIRM", firmName: "Should not persist" });
    assert.equal(duplicateUsernameResponse.status, 409);
    assert.equal(await prisma.practiceWorkspace.count({ where: { name: "Should not persist" } }), 0, "unique conflicts do not leave workspaces behind");

    const missingSupervisor = await practiceRequest({ ...practiceBase(`missing-supervisor-${randomUUID()}`), accountType: "ASSISTANT" });
    assert.equal(missingSupervisor.status, 400);

    const inactiveValues = { ...practiceBase(`inactive-${randomUUID()}`), accountType: "LAWYER", workspaceMode: "INDIVIDUAL", status: "DISABLED" };
    const inactiveResponse = await practiceRequest(inactiveValues);
    assert.equal(inactiveResponse.status, 201);
    const inactiveCreated = await inactiveResponse.json() as { id: string; workspaceId: string; membershipId: string; status: string };
    practiceCreatedUserIds.push(inactiveCreated.id); practiceCreatedWorkspaceIds.push(inactiveCreated.workspaceId);
    assert.equal(inactiveCreated.status, "DISABLED");
    const inactiveLogin = await request("/api/auth/login/lawyer", "POST", null, { email: inactiveValues.email, password: inactiveValues.password });
    assert.equal(inactiveLogin.status, 401, "disabled practice accounts cannot authenticate");

    const creationAudit = await prisma.securityAuditEvent.findFirst({ where: { targetId: assistantCreated.membershipId, eventType: "PLATFORM_PRACTICE_USER_CREATED" } });
    assert.equal(creationAudit?.actorUserId, actorId);
    assert.equal(creationAudit?.metadata && typeof creationAudit.metadata === "object" ? (creationAudit.metadata as Record<string, unknown>).accountType : null, "ASSISTANT");

    const failPracticeAuditSql = `CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type = 'PLATFORM_PRACTICE_USER_CREATED' THEN RAISE EXCEPTION 'test practice audit failure'; END IF; RETURN NEW; END $$`;
    await prisma.$executeRawUnsafe(failPracticeAuditSql);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER ${triggerName} BEFORE INSERT ON security_audit_events FOR EACH ROW EXECUTE FUNCTION ${functionName}()`);
    triggerCreated = true;
    const rollbackValues = { ...practiceBase(`rollback-${randomUUID()}`), accountType: "FIRM", firmName: "Rollback Practice Firm" };
    const rollbackResponse = await practiceRequest(rollbackValues);
    assert.equal(rollbackResponse.status, 500);
    assert.equal(await prisma.user.count({ where: { emailNormalized: rollbackValues.email } }), 0, "audit failure rolls back user and workspace creation");
    assert.equal(await prisma.practiceWorkspace.count({ where: { name: rollbackValues.firmName } }), 0, "audit failure leaves no orphaned workspace");
    await prisma.$executeRawUnsafe(`DROP TRIGGER ${triggerName} ON security_audit_events`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION ${functionName}()`);
    triggerCreated = false;

    for (const invalidQuery of ["page=0", "pageSize=101", "role=PLATFORM_OWNER", "status=LOCKED", "workspaceKind=PERSONAL", "unknown=1"]) {
      assert.equal((await request(`/api/platform-admin/users?${invalidQuery}`)).status, 400, `reject ${invalidQuery}`);
    }
    const invalidBody = await request(`/api/platform-admin/users/${targetId}/status`, "PATCH", 0, { status: "DISABLED", role: "SUPER_ADMIN" });
    assert.equal(invalidBody.status, 400);

    for (const endpoint of [
      `/api/platform-admin/users?search=${encodeURIComponent(emails[4]!)}&role=ASSISTANT&status=DISABLED&workspaceKind=FIRM&page=1&pageSize=1`,
      `/api/platform-admin/users/${disabledId}`,
    ]) {
      const deniedId = randomUUID(); requestIds.push(deniedId);
      assert.equal((await request(endpoint, "GET", 1, undefined, deniedId)).status, 403);
    }
    const deniedMutationId = randomUUID(); requestIds.push(deniedMutationId);
    assert.equal((await request(`/api/platform-admin/users/${targetId}/status`, "PATCH", 1, { status: "DISABLED" }, deniedMutationId)).status, 403);
    const denial = await prisma.securityAuditEvent.findFirst({ where: { requestId: deniedMutationId, actorUserId: firmAdminId } });
    assert.equal(denial?.eventType, "AUTHZ_DENIED");

    const activationId = randomUUID(); requestIds.push(activationId);
    const activated = await request(`/api/platform-admin/users/${disabledId}/status`, "PATCH", 0, { status: "ACTIVE" }, activationId);
    assert.equal(activated.status, 200);
    assert.equal((await activated.json() as { changed: boolean }).changed, true);
    assert.ok((await prisma.userSession.findUniqueOrThrow({ where: { id: sessionIds[3] } })).revokedAt,
      "activation does not restore old sessions");
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: membershipIds[2] } })).status, "SUSPENDED",
      "global activation does not reinstate a practice membership");

    const failAuditSql = `CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type = 'PLATFORM_USER_STATUS_CHANGED' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`;
    await prisma.$executeRawUnsafe(failAuditSql);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER ${triggerName} BEFORE INSERT ON security_audit_events FOR EACH ROW EXECUTE FUNCTION ${functionName}()`);
    triggerCreated = true;
    const failedChangeId = randomUUID(); requestIds.push(failedChangeId);
    assert.equal((await request(`/api/platform-admin/users/${targetId}/status`, "PATCH", 0, { status: "DISABLED" }, failedChangeId)).status, 500);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: targetId } })).status, "ACTIVE",
      "audit failure rolls back the account status change");
    assert.equal((await prisma.userSession.findUniqueOrThrow({ where: { id: sessionIds[2] } })).revokedAt, null,
      "audit failure rolls back session revocation");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: failedChangeId, eventType: "PLATFORM_USER_STATUS_CHANGED" } }), 0);
    await prisma.$executeRawUnsafe(`DROP TRIGGER ${triggerName} ON security_audit_events`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION ${functionName}()`);
    triggerCreated = false;

    const suspendId = randomUUID(); requestIds.push(suspendId);
    const suspended = await request(`/api/platform-admin/users/${targetId}/status`, "PATCH", 0, { status: "DISABLED" }, suspendId);
    assert.equal(suspended.status, 200);
    assert.deepEqual(await suspended.json(), { id: targetId, status: "DISABLED", changed: true });
    assert.ok((await prisma.userSession.findUniqueOrThrow({ where: { id: sessionIds[2] } })).revokedAt,
      "suspension revokes all active sessions");
    assert.equal((await request("/api/auth/me", "GET", 2)).status, 401,
      "a request using the disabled user's existing cookie is rejected immediately");
    const successAudit = await prisma.securityAuditEvent.findFirst({ where: { requestId: suspendId } });
    assert.equal(successAudit?.eventType, "PLATFORM_USER_STATUS_CHANGED");
    assert.equal(successAudit?.actorUserId, actorId);
    assert.equal(successAudit?.targetId, targetId);
    assert.deepEqual(successAudit?.metadata, { fromStatus: "ACTIVE", toStatus: "DISABLED", outcome: "success" });

    const selfSuspendId = randomUUID(); requestIds.push(selfSuspendId);
    assert.equal((await request(`/api/platform-admin/users/${actorId}/status`, "PATCH", 0, { status: "DISABLED" }, selfSuspendId)).status, 409);
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: selfSuspendId, eventType: "PLATFORM_USER_STATUS_CHANGE_DENIED" } }), 1);

    const finalAdminRequestId = randomUUID(); requestIds.push(finalAdminRequestId);
    const unprivilegedActor = await prisma.user.findUniqueOrThrow({ where: { id: actorId } });
    assert.equal(unprivilegedActor.passwordHash, null, "synthetic acting grant is not a viable password administrator");
    const finalAdminResponse = await request(`/api/platform-admin/users/${viableAdminId}/status`, "PATCH", 0, { status: "DISABLED" }, finalAdminRequestId);
    if (externalViableAdministrators === 0) {
      assert.equal(finalAdminResponse.status, 409, "last viable platform administrator cannot be disabled");
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: viableAdminId } })).status, "ACTIVE");
      assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: finalAdminRequestId, eventType: "PLATFORM_USER_STATUS_CHANGE_DENIED" } }), 1);
    } else {
      // Another viable administrator (a shared acceptance fixture) legitimately satisfies the guard,
      // so disabling this one must succeed; the platform must still retain a viable administrator.
      assert.equal(finalAdminResponse.status, 200, "disabling is allowed while another viable administrator exists");
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: viableAdminId } })).status, "DISABLED");
      assert.ok(await prisma.user.count({ where: viableAdministratorWhere }) >= 1,
        "the platform still has a viable platform administrator");
      assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: finalAdminRequestId, eventType: "PLATFORM_USER_STATUS_CHANGED" } }), 1);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: { in: [raceAdminAId, raceAdminBId] } }, data: { passwordHash: viableAdminHash } });
      await tx.platformRoleGrant.createMany({ data: [raceAdminAId, raceAdminBId].map((userId) => ({
        id: randomUUID(), userId, role: "SUPER_ADMIN" as const,
      })) });
    });
    const raceRequestA = randomUUID(); requestIds.push(raceRequestA);
    const raceRequestB = randomUUID(); requestIds.push(raceRequestB);
    const [raceAResponse, raceBResponse] = await Promise.all([
      request(`/api/platform-admin/users/${raceAdminBId}/status`, "PATCH", 4, { status: "DISABLED" }, raceRequestA),
      request(`/api/platform-admin/users/${raceAdminAId}/status`, "PATCH", 5, { status: "DISABLED" }, raceRequestB),
    ]);
    assert.ok([200, 409].includes(raceAResponse.status), `first concurrent request returned ${raceAResponse.status}`);
    assert.ok([200, 409].includes(raceBResponse.status), `second concurrent request returned ${raceBResponse.status}`);
    const raceStatuses = await prisma.user.findMany({ where: { id: { in: [raceAdminAId, raceAdminBId] } }, select: { id: true, status: true } });
    const raceStatusById = new Map(raceStatuses.map((user) => [user.id, user.status]));
    if (externalViableAdministrators === 0) {
      assert.equal(raceStatuses.filter((user) => user.status === "ACTIVE").length, 1,
        "concurrent disable attempts cannot remove both remaining viable Super Admins");
    } else {
      // A shared acceptance administrator already satisfies the guard, so either request may commit;
      // the invariant that survives is that every response matches persisted state and one viable
      // administrator always remains.
      for (const [id, response] of [[raceAdminBId, raceAResponse], [raceAdminAId, raceBResponse]] as const) {
        assert.equal(raceStatusById.get(id), response.status === 200 ? "DISABLED" : "ACTIVE",
          "each concurrent response matches the persisted account status");
      }
      assert.ok(await prisma.user.count({ where: viableAdministratorWhere }) >= 1,
        "concurrent disable attempts cannot leave the platform without a viable administrator");
    }
    for (const [requestId, response] of [[raceRequestA, raceAResponse], [raceRequestB, raceBResponse]] as const) {
      const event = await prisma.securityAuditEvent.findFirst({ where: { requestId, eventType: "PLATFORM_USER_STATUS_CHANGED" } });
      assert.equal(Boolean(event), response.status === 200, "only a committed status mutation has a success audit event");
    }
  } finally {
    await app?.close().catch(() => undefined);
    if (triggerCreated) {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${triggerName} ON security_audit_events`).catch(() => undefined);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${functionName}()`).catch(() => undefined);
    }
    if (fixturesCreated) {
      const persistedPhotos = practiceCreatedUserIds.length
        ? await prisma.user.findMany({ where: { id: { in: practiceCreatedUserIds } }, select: { profilePhotoKey: true } }).catch(() => [])
        : [];
      const allPhotoKeys = new Set([...profilePhotoKeys, ...persistedPhotos.flatMap((user) => user.profilePhotoKey ? [user.profilePhotoKey] : [])]);
      await Promise.all([...allPhotoKeys].map((key) => photoStorage?.remove(key)));
      await prisma.$transaction(async (tx) => {
        await tx.securityAuditEvent.deleteMany({ where: { OR: [
          { requestId: { in: requestIds } }, { actorUserId: { in: userIds } }, { targetId: { in: userIds } },
        ] } });
        await tx.platformRoleGrant.deleteMany({ where: { userId: { in: userIds } } });
        await tx.userSession.deleteMany({ where: { userId: { in: userIds } } });
        await tx.lawyerProfile.deleteMany({ where: { workspaceId: { in: [...workspaceIds, ...practiceCreatedWorkspaceIds] } } });
        await tx.practiceMembership.deleteMany({ where: { userId: { in: practiceCreatedUserIds }, role: "ASSISTANT" } });
        await tx.practiceMembership.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.practiceMembership.deleteMany({ where: { userId: { in: practiceCreatedUserIds } } });
        await tx.securityAuditEvent.deleteMany({ where: { targetId: { in: practiceCreatedUserIds } } });
        await tx.securityAuditEvent.deleteMany({ where: { workspaceId: { in: practiceCreatedWorkspaceIds } } });
        await tx.practiceWorkspace.deleteMany({ where: { id: { in: practiceCreatedWorkspaceIds } } });
        await tx.user.deleteMany({ where: { id: { in: practiceCreatedUserIds } } });
        await tx.practiceWorkspace.deleteMany({ where: { id: { in: workspaceIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }
});
