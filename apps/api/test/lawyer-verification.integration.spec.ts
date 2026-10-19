import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { LawyerVerificationModule } from "../src/lawyer-verification/lawyer-verification.module";
import { PrivateDocumentStorage } from "../src/lawyer-verification/private-document-storage";
import { AUTH_ENVIRONMENT } from "../src/auth/auth.types";
import type { AuthEnvironment } from "../src/auth/auth.types";
import { sessionCookieName } from "../src/auth/session-cookie";
import { hashSessionToken } from "../src/auth/auth.service";
import { configureCors } from "../src/config/cors";
import { PrismaService } from "../src/database/prisma.service";

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (parsed.pathname.slice(1) !== "jurismind_auth_test" || !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("Safety stop: lawyer credential integration tests require local jurismind_auth_test.");
  }
}

test("lawyer credential verification is private, authorized, audited, and concurrency-safe in PostgreSQL", {
  skip: !databaseUrl ? "Set AUTH_TEST_DATABASE_URL to local jurismind_auth_test." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const environment: AuthEnvironment = {
    nodeEnv: "test", trustedOrigins: ["http://localhost:3000"], sessionTtlSeconds: 3600,
    passwordMinLength: 12, loginRateLimitMax: 5, loginRateLimitWindowSeconds: 900,
    invitationDevTokenDelivery: false, mfaEncryptionKey: Buffer.alloc(32, 2), lawyerCredentialEncryptionKey: Buffer.alloc(32, 3),
    publicWebUrl: "http://localhost:3000", passwordResetEmailEndpoint: "https://mail.example.invalid/send",
    passwordResetEmailApiKey: "integration-only", passwordResetEmailFrom: "noreply@example.invalid",
  };
  const storage = new PrivateDocumentStorage(environment);
  const userIds = Array.from({ length: 5 }, () => randomUUID());
  const [lawyerA, lawyerB, assistant, firmAdmin, superAdmin] = userIds as [string, string, string, string, string];
  const workspaceIds = [randomUUID(), randomUUID()];
  const membershipIds = Array.from({ length: 4 }, () => randomUUID());
  const profileIds = Array.from({ length: 3 }, () => randomUUID());
  const sessionIds = Array.from({ length: 5 }, () => randomUUID());
  const sessionUserIds = userIds;
  const tokens = sessionIds.map(() => randomBytes(32).toString("base64url"));
  const emails = userIds.map((_, index) => `credential-test-${index}-${randomUUID()}@example.invalid`);
  const requestIds: string[] = [];
  const functionName = `credential_fail_audit_${randomUUID().replaceAll("-", "")}`;
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
  const createSubmission = (who: number, workspaceId: string, cardIdentifier: string) => {
    const body = new FormData();
    body.set("cardHolderName", who === 0 ? "Synthetic Lawyer One" : "Synthetic Lawyer Two");
    body.set("jurisdiction", "Example District");
    body.set("cardIdentifier", cardIdentifier);
    body.set("document", new Blob([Buffer.from("%PDF-1.7\nSynthetic credential test document", "ascii")], { type: "application/pdf" }), "credential.pdf");
    const id = randomUUID(); requestIds.push(id);
    return request(`/api/workspaces/${workspaceId}/lawyer-verification`, "POST", who, body, id);
  };

  try {
    await prisma.$connect();
    const database = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    assert.equal(database[0]?.name, "jurismind_auth_test", "tests must never modify jurismind_dev");
    await prisma.$transaction(async (tx) => {
      await tx.user.createMany({ data: userIds.map((id, index) => ({ id, email: emails[index]!, emailNormalized: emails[index]!, fullName: `Synthetic Verification User ${index}` })) });
      await tx.practiceWorkspace.createMany({ data: [
        { id: workspaceIds[0]!, name: "Synthetic Credential Firm A", slug: `credential-a-${randomUUID()}`, kind: "FIRM" },
        { id: workspaceIds[1]!, name: "Synthetic Credential Firm B", slug: `credential-b-${randomUUID()}`, kind: "FIRM" },
      ] });
      await tx.practiceMembership.createMany({ data: [
        { id: membershipIds[0]!, workspaceId: workspaceIds[0]!, userId: lawyerA, role: "LAWYER", status: "ACTIVE", joinedAt: new Date() },
        { id: membershipIds[1]!, workspaceId: workspaceIds[0]!, userId: lawyerB, role: "LAWYER", status: "ACTIVE", joinedAt: new Date() },
        { id: membershipIds[2]!, workspaceId: workspaceIds[0]!, userId: assistant, role: "ASSISTANT", status: "ACTIVE", supervisingLawyerMembershipId: membershipIds[0]!, joinedAt: new Date() },
        { id: membershipIds[3]!, workspaceId: workspaceIds[1]!, userId: lawyerB, role: "LAWYER", status: "ACTIVE", joinedAt: new Date() },
      ] });
      await tx.lawyerProfile.createMany({ data: [
        { id: profileIds[0]!, workspaceId: workspaceIds[0]!, membershipId: membershipIds[0]! },
        { id: profileIds[1]!, workspaceId: workspaceIds[0]!, membershipId: membershipIds[1]! },
        { id: profileIds[2]!, workspaceId: workspaceIds[1]!, membershipId: membershipIds[3]! },
      ] });
      await tx.platformRoleGrant.create({ data: { id: randomUUID(), userId: superAdmin, role: "SUPER_ADMIN" } });
      await tx.userSession.createMany({ data: sessionIds.map((id, index) => ({ id, userId: sessionUserIds[index]!, tokenHash: hashSessionToken(tokens[index]!), expiresAt: new Date(Date.now() + 3600_000) })) });
    });
    fixturesCreated = true;

    const testingModule = await Test.createTestingModule({ imports: [LawyerVerificationModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .overrideProvider(AUTH_ENVIRONMENT).useValue(environment)
      .overrideProvider(PrivateDocumentStorage).useValue(storage)
      .compile();
    app = testingModule.createNestApplication({ logger: false });
    configureCors(app, environment.trustedOrigins);
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    assert.ok(address && typeof address !== "string");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const root = `/api/workspaces/${workspaceIds[0]}/lawyer-verification`;
    assert.equal((await request(root, "GET", null)).status, 401, "unauthenticated status access is denied");
    assert.equal((await createSubmission(2, workspaceIds[0]!, "ASST-0001")).status, 403, "assistants cannot submit lawyer credentials");
    assert.equal((await request(`/api/workspaces/${workspaceIds[1]}/lawyer-verification`, "GET", 0)).status, 403,
      "a lawyer cannot access another workspace's credential records");

    const badFile = new FormData();
    badFile.set("cardHolderName", "Synthetic Lawyer One"); badFile.set("jurisdiction", "Example District"); badFile.set("cardIdentifier", "BAD-0001");
    badFile.set("document", new Blob(["not pdf"], { type: "application/pdf" }), "fake.pdf");
    assert.equal((await request(root, "POST", 0, badFile)).status, 400, "MIME type without matching file content is rejected");
    assert.equal(await prisma.lawyerCredentialSubmission.count({ where: { membershipId: { in: membershipIds } } }), 0,
      "invalid file content does not create verification state for this test's memberships");

    const submitted = await createSubmission(0, workspaceIds[0]!, "BAR-00001234");
    assert.equal(submitted.status, 201);
    const first = await submitted.json() as { id: string; status: string; cardIdentifierLast4: string };
    assert.equal(first.status, "PENDING", "upload never approves a lawyer automatically");
    assert.equal(first.cardIdentifierLast4, "1234");
    assert.equal(JSON.stringify(first).includes("BAR-00001234"), false, "submission response does not disclose full card identifier");
    assert.equal((await createSubmission(0, workspaceIds[0]!, "BAR-RETRY-1234")).status, 409,
      "a second pending submission is rejected and its staged file is discarded");

    const mine = await request(root);
    assert.equal(mine.status, 200);
    const mineJson = await mine.json() as { currentStatus: string; submissions: Array<Record<string, unknown>> };
    assert.equal(mineJson.currentStatus, "PENDING");
    assert.equal(mineJson.submissions.length, 1);
    assert.equal(JSON.stringify(mineJson).includes("cardIdentifierCiphertext"), false);
    assert.equal(JSON.stringify(mineJson).includes("BAR-00001234"), false);
    const documentId = (mineJson.submissions[0]!.documents as Array<{ id: string }>)[0]!.id;
    const ownerDocument = await request(`${root}/${first.id}/documents/${documentId}`);
    assert.equal(ownerDocument.status, 200);
    assert.equal(ownerDocument.headers.get("content-disposition")?.includes("attachment"), true);
    assert.equal((await ownerDocument.arrayBuffer()).byteLength > 0, true);
    assert.equal((await request(`${root}/${first.id}/documents/${documentId}`, "GET", 1)).status, 404,
      "same-workspace lawyer cannot retrieve another lawyer's document");
    const lawyerBRecords = await request(root, "GET", 1);
    assert.equal((await lawyerBRecords.json() as { submissions: unknown[] }).submissions.length, 0,
      "same-workspace membership does not expose another lawyer's private verification");

    const adminQueuePath = "/api/platform-admin/lawyer-verifications";
    assert.equal((await request(adminQueuePath, "GET", 0)).status, 403, "practice lawyer cannot access the platform review queue");
    assert.equal((await request(adminQueuePath, "GET", 2)).status, 403, "assistant cannot access the platform review queue");
    assert.equal((await request(`${adminQueuePath}/${first.id}/review`, "POST", 0, { decision: "APPROVED" })).status, 403,
      "a practice lawyer cannot approve or reject credential submissions");
    const queueResponse = await request(adminQueuePath, "GET", 4);
    assert.equal(queueResponse.status, 200);
    const queue = await queueResponse.json() as { submissions: Array<Record<string, unknown>>; pagination: { total: number } };
    assert.equal(queue.pagination.total, 1);
    assert.equal(JSON.stringify(queue).includes("BAR-00001234"), false, "queue list exposes only the masked card identifier");
    const adminDetailResponse = await request(`${adminQueuePath}/${first.id}`, "GET", 4);
    assert.equal(adminDetailResponse.status, 200);
    assert.equal((await adminDetailResponse.json() as { cardIdentifier: string }).cardIdentifier, "BAR-00001234");
    const adminDocument = await request(`${adminQueuePath}/${first.id}/documents/${documentId}`, "GET", 4);
    assert.equal(adminDocument.status, 200);
    assert.equal((await adminDocument.arrayBuffer()).byteLength > 0, true);

    assert.equal((await request(`${adminQueuePath}/${first.id}/review`, "POST", 4, { decision: "REJECTED" })).status, 400,
      "a rejection requires a recorded reason");
    const rejectId = randomUUID(); requestIds.push(rejectId);
    const rejected = await request(`${adminQueuePath}/${first.id}/review`, "POST", 4,
      { decision: "REJECTED", reason: "The synthetic card image is unreadable." }, rejectId);
    assert.equal(rejected.status, 201);
    assert.equal((await rejected.json() as { status: string }).status, "REJECTED");
    assert.equal((await prisma.securityAuditEvent.count({ where: { requestId: rejectId, eventType: "LAWYER_CREDENTIAL_REVIEWED" } })), 1,
      "rejection decision and audit event are persisted");
    const rejectedMine = await request(root);
    assert.equal((await rejectedMine.json() as { currentStatus: string }).currentStatus, "REJECTED");

    const resubmitted = await createSubmission(0, workspaceIds[0]!, "BAR-00001234");
    assert.equal(resubmitted.status, 201, "rejection allows a new history row to be submitted");
    const second = await resubmitted.json() as { id: string; status: string };
    assert.equal(second.status, "PENDING");
    assert.equal((await request(root, "POST", 0, new FormData())).status, 400, "an invalid repeated submission fails without changing pending state");
    await assert.rejects(prisma.lawyerCredentialSubmission.update({ where: { id: second.id }, data: { status: "APPROVED" } }),
      "database check constraint rejects a review state without reviewer and timestamp");
    assert.equal((await prisma.lawyerCredentialSubmission.findUniqueOrThrow({ where: { id: second.id } })).status, "PENDING");
    await assert.rejects(prisma.lawyerCredentialDocument.create({ data: { submissionId: second.id, workspaceId: workspaceIds[0]!,
      membershipId: membershipIds[0]!, storageKey: `${randomUUID()}.private`, mediaType: "application/x-executable", sizeBytes: 10,
      sha256: "0".repeat(64) } }), "database check constraint rejects unsupported document media types");

    const failAuditSql = `CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type = 'LAWYER_CREDENTIAL_REVIEWED' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`;
    await prisma.$executeRawUnsafe(failAuditSql);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER ${functionName} BEFORE INSERT ON security_audit_events FOR EACH ROW EXECUTE FUNCTION ${functionName}()`);
    triggerCreated = true;
    assert.equal((await request(`${adminQueuePath}/${second.id}/review`, "POST", 4, { decision: "APPROVED" })).status, 500);
    assert.equal((await prisma.lawyerCredentialSubmission.findUniqueOrThrow({ where: { id: second.id } })).status, "PENDING",
      "failed audit insert rolls back the review decision");
    await prisma.$executeRawUnsafe(`DROP TRIGGER ${functionName} ON security_audit_events`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION ${functionName}()`);
    triggerCreated = false;

    const approveId = randomUUID(); requestIds.push(approveId);
    const approved = await request(`${adminQueuePath}/${second.id}/review`, "POST", 4, { decision: "APPROVED" }, approveId);
    assert.equal(approved.status, 201);
    assert.equal((await approved.json() as { status: string }).status, "APPROVED");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: approveId, eventType: "LAWYER_CREDENTIAL_REVIEWED" } }), 1);
    assert.equal((await request(`${adminQueuePath}/${second.id}/review`, "POST", 4, { decision: "REJECTED", reason: "Stale decision." })).status, 409,
      "a stale review cannot overwrite an approval");
    assert.equal((await prisma.lawyerCredentialSubmission.findMany({ where: { membershipId: membershipIds[0]! }, orderBy: { createdAt: "asc" } })).length, 2,
      "history retains the rejection and approval submissions");

    const lawyerBSubmission = await createSubmission(1, workspaceIds[0]!, "BAR-00005678");
    assert.equal(lawyerBSubmission.status, 201);
    const third = await lawyerBSubmission.json() as { id: string };
    const [raceApprove, raceReject] = await Promise.all([
      request(`${adminQueuePath}/${third.id}/review`, "POST", 4, { decision: "APPROVED" }),
      request(`${adminQueuePath}/${third.id}/review`, "POST", 4, { decision: "REJECTED", reason: "Concurrent synthetic review." }),
    ]);
    assert.deepEqual([raceApprove.status, raceReject.status].sort(), [201, 409], "only one concurrent review may commit");
    assert.equal(await prisma.securityAuditEvent.count({ where: { targetId: third.id, eventType: "LAWYER_CREDENTIAL_REVIEWED" } }), 1,
      "concurrent review creates one successful audit event");
  } finally {
    await app?.close().catch(() => undefined);
    if (triggerCreated) {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${functionName} ON security_audit_events`).catch(() => undefined);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${functionName}()`).catch(() => undefined);
    }
    if (fixturesCreated) {
      const ownedDocs = await prisma.lawyerCredentialDocument.findMany({ where: { membershipId: { in: membershipIds } }, select: { storageKey: true } }).catch(() => []);
      for (const doc of ownedDocs) await storage.remove(doc.storageKey);
      await prisma.$transaction(async (tx) => {
        await tx.securityAuditEvent.deleteMany({ where: { OR: [
          { requestId: { in: requestIds } }, { actorUserId: { in: userIds } },
          { targetId: { in: userIds } }, { targetId: { in: (await tx.lawyerCredentialSubmission.findMany({ where: { membershipId: { in: membershipIds } }, select: { id: true } })).map((item) => item.id) } },
        ] } });
        await tx.lawyerCredentialDocument.deleteMany({ where: { membershipId: { in: membershipIds } } });
        await tx.lawyerCredentialSubmission.deleteMany({ where: { membershipId: { in: membershipIds } } });
        await tx.lawyerProfile.deleteMany({ where: { id: { in: profileIds } } });
        await tx.platformRoleGrant.deleteMany({ where: { userId: { in: userIds } } });
        await tx.userSession.deleteMany({ where: { userId: { in: userIds } } });
        await tx.practiceMembership.deleteMany({ where: { id: { in: membershipIds } } });
        await tx.practiceWorkspace.deleteMany({ where: { id: { in: workspaceIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }
});
