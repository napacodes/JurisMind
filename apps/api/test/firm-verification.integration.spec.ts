import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { FirmVerificationModule } from "../src/firm-verification/firm-verification.module";
import { AUTH_ENVIRONMENT } from "../src/auth/auth.types";
import type { AuthEnvironment } from "../src/auth/auth.types";
import { sessionCookieName } from "../src/auth/session-cookie";
import { hashSessionToken } from "../src/auth/auth.service";
import { configureCors } from "../src/config/cors";
import { PrismaService } from "../src/database/prisma.service";
import { PrivateDocumentStorage } from "../src/lawyer-verification/private-document-storage";

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (parsed.pathname.slice(1) !== "jurismind_auth_test" || !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("Safety stop: firm verification integration tests require local jurismind_auth_test.");
  }
}

test("firm verification is encrypted, tenant-scoped, auditable, private, and reviewable in PostgreSQL", {
  skip: !databaseUrl ? "Set AUTH_TEST_DATABASE_URL to local jurismind_auth_test." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const environment: AuthEnvironment = {
    nodeEnv: "test", trustedOrigins: ["http://localhost:3000"], sessionTtlSeconds: 3600,
    passwordMinLength: 12, loginRateLimitMax: 5, loginRateLimitWindowSeconds: 900,
    invitationDevTokenDelivery: false, mfaEncryptionKey: Buffer.alloc(32, 12), lawyerCredentialEncryptionKey: Buffer.alloc(32, 13),
    firmVerificationValidityDays: 1,
  };
  const storage = new PrivateDocumentStorage(environment);
  const userIds = [randomUUID(), randomUUID(), randomUUID()];
  const [firmAdmin, otherFirmAdmin, superAdmin] = userIds as [string, string, string];
  const workspaceIds = [randomUUID(), randomUUID()];
  const membershipIds = [randomUUID(), randomUUID()];
  const sessionIds = [randomUUID(), randomUUID(), randomUUID()];
  const tokens = sessionIds.map(() => randomBytes(32).toString("base64url"));
  const emails = userIds.map((_, index) => `firm-verification-${index}-${randomUUID()}@example.invalid`);
  const requestIds: string[] = [];
  let fixturesCreated = false;
  let app: INestApplication | undefined;
  let baseUrl = "";
  const origin = environment.trustedOrigins[0]!;
  const cookieName = sessionCookieName(environment);
  const request = (path: string, method = "GET", who: number | null = 0, body?: BodyInit, requestId?: string) => {
    const headers = new Headers({ origin });
    if (who !== null) headers.set("cookie", `${cookieName}=${tokens[who]}`);
    if (body && !(body instanceof FormData)) headers.set("content-type", "application/json");
    if (requestId) headers.set("x-request-id", requestId);
    return fetch(`${baseUrl}${path}`, { method, headers, ...(body === undefined ? {} : { body }) });
  };
  const form = () => {
    const data = new FormData();
    data.set("legalName", "Synthetic Example Legal LLC");
    data.set("registrationNumber", "SYN-REG-001");
    data.set("jurisdiction", "Example District");
    data.set("legalForm", "Limited liability company");
    data.set("registeredAddress", "1 Synthetic Avenue");
    data.set("representativeName", "Synthetic Firm Admin");
    data.set("representativeTitle", "Managing Partner");
    data.set("authorityDescription", "Synthetic board resolution authorizes this representative.");
    data.set("registrationDocument", new Blob([Buffer.from("%PDF-1.7\nsynthetic registration document", "ascii")], { type: "application/pdf" }), "registration.pdf");
    data.set("authorityDocument", new Blob([Buffer.from("%PDF-1.7\nsynthetic authority evidence", "ascii")], { type: "application/pdf" }), "authority.pdf");
    return data;
  };

  try {
    await prisma.$connect();
    const database = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    assert.equal(database[0]?.name, "jurismind_auth_test", "tests may not modify development or production databases");
    await prisma.$transaction(async (tx) => {
      await tx.user.createMany({ data: userIds.map((id, index) => ({ id, email: emails[index]!, emailNormalized: emails[index]!, fullName: `Synthetic Firm User ${index}` })) });
      await tx.practiceWorkspace.createMany({ data: workspaceIds.map((id, index) => ({ id,
        name: `Synthetic Firm ${index}`, slug: `firm-kyc-${randomUUID()}`, kind: "FIRM" })) });
      await tx.practiceMembership.createMany({ data: membershipIds.map((id, index) => ({ id,
        workspaceId: workspaceIds[index]!, userId: userIds[index]!, role: "FIRM_ADMIN", status: "ACTIVE", joinedAt: new Date() })) });
      await tx.platformRoleGrant.create({ data: { id: randomUUID(), userId: superAdmin, role: "SUPER_ADMIN" } });
      await tx.userSession.createMany({ data: sessionIds.map((id, index) => ({ id, userId: userIds[index]!,
        tokenHash: hashSessionToken(tokens[index]!), expiresAt: new Date(Date.now() + 3_600_000) })) });
    });
    fixturesCreated = true;

    const testingModule = await Test.createTestingModule({ imports: [FirmVerificationModule] })
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

    const root = `/api/workspaces/${workspaceIds[0]}/firm-verification`;
    assert.equal((await request(root, "GET", null)).status, 401, "unauthenticated verification access is denied");
    assert.equal((await request(root, "GET", 1)).status, 403, "another firm's admin cannot access this tenant");
    const draftResponse = await request(`${root}/draft`, "PUT", 0, JSON.stringify({ legalName: "Synthetic Draft LLC" }));
    assert.equal(draftResponse.status, 200, "incomplete firm KYC can be saved as a draft");
    const draft = await draftResponse.json() as { id: string; status: string };
    assert.equal(draft.status, "DRAFT");
    assert.equal((await request("/api/platform-admin/firm-verifications?status=ALL", "GET", 2)).status, 200,
      "reviewers cannot list draft submissions as review history");
    const missingAuthority = form(); missingAuthority.delete("authorityDocument");
    assert.equal((await request(root, "POST", 0, missingAuthority)).status, 400, "required authority evidence is enforced");

    const firstRequestId = randomUUID(); requestIds.push(firstRequestId);
    const firstResponse = await request(root, "POST", 0, form(), firstRequestId);
    assert.equal(firstResponse.status, 201);
    const first = await firstResponse.json() as { id: string; status: string };
    assert.equal(first.status, "PENDING");
    assert.equal(first.id, draft.id, "final submission transitions the saved draft rather than duplicating it");
    assert.equal(JSON.stringify(first).includes("SYN-REG-001"), false, "response does not disclose legal registration number");
    const privateRow = await prisma.firmVerificationSubmission.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(privateRow.detailsCiphertext.includes("SYN-REG-001"), false, "sensitive firm details are encrypted at rest");
    const own = await request(root);
    assert.equal(own.status, 200);
    const ownJson = await own.json() as { currentStatus: string; submissions: Array<{ details: { registrationNumber: string }; documents: Array<{ id: string }> }> };
    assert.equal(ownJson.currentStatus, "PENDING");
    assert.equal(ownJson.submissions[0]?.details.registrationNumber, "SYN-REG-001", "authorized firm admins can see their own details");
    const documents = ownJson.submissions[0]!.documents;
    assert.equal(documents.length, 2);
    const ownerDocPath = `${root}/${first.id}/documents/${documents[0]!.id}`;
    assert.equal((await request(ownerDocPath, "GET", 1)).status, 403, "a foreign firm admin cannot download the document");
    assert.equal((await request(ownerDocPath)).status, 200);

    const adminRoot = "/api/platform-admin/firm-verifications";
    assert.equal((await request(adminRoot)).status, 403, "practice role cannot list firm verification submissions");
    const selfGrant = await prisma.platformRoleGrant.create({ data: { userId: firmAdmin, role: "SUPER_ADMIN" }, select: { id: true } });
    assert.equal((await request(`${adminRoot}/${first.id}/review`, "POST", 0,
      JSON.stringify({ decision: "APPROVED" }))).status, 403, "reviewer cannot approve their own firm's submission");
    await prisma.platformRoleGrant.delete({ where: { id: selfGrant.id } });
    const queue = await request(`${adminRoot}?status=PENDING&pageSize=100`, "GET", 2);
    assert.equal(queue.status, 200);
    const queueJson = await queue.json() as { pagination: { total: number; totalPages: number }; submissions: Array<{ id: string }> };
    assert.ok(queueJson.pagination.total >= 1, "pending queue includes existing and newly submitted records");
    let queueSubmissions = queueJson.submissions;
    if (!queueSubmissions.some((submission) => submission.id === first.id) && queueJson.pagination.totalPages > 1) {
      const lastPage = await request(`${adminRoot}?status=PENDING&page=${queueJson.pagination.totalPages}&pageSize=100`, "GET", 2);
      assert.equal(lastPage.status, 200);
      queueSubmissions = (await lastPage.json() as typeof queueJson).submissions;
    }
    assert.ok(queueSubmissions.some((submission) => submission.id === first.id), "pending queue includes this fixture's submission");
    const detailResponse = await request(`${adminRoot}/${first.id}`, "GET", 2);
    assert.equal(detailResponse.status, 200);
    const detail = await detailResponse.json() as { details: { registrationNumber: string }; documents: Array<{ id: string }> };
    assert.equal(detail.details.registrationNumber, "SYN-REG-001");
    assert.equal((await request(`${adminRoot}/${first.id}/documents/${detail.documents[0]!.id}`, "GET", 2)).status, 200);

    const correctionId = randomUUID(); requestIds.push(correctionId);
    const correction = await request(`${adminRoot}/${first.id}/review`, "POST", 2,
      JSON.stringify({ decision: "CHANGES_REQUESTED", reason: "Provide an updated representative authority document." }), correctionId);
    assert.equal(correction.status, 201);
    assert.equal((await (await request(root)).json() as { currentStatus: string }).currentStatus, "CHANGES_REQUESTED");
    const secondRequestId = randomUUID(); requestIds.push(secondRequestId);
    const second = await request(root, "POST", 0, form(), secondRequestId);
    assert.equal(second.status, 201, "firm admins can submit a corrected revision while retaining history");
    const secondRow = await second.json() as { id: string; status: string };
    assert.equal(secondRow.status, "PENDING");
    const approvalId = randomUUID(); requestIds.push(approvalId);
    assert.equal((await request(`${adminRoot}/${secondRow.id}/review`, "POST", 2, JSON.stringify({ decision: "APPROVED" }), approvalId)).status, 201);
    await prisma.firmVerificationSubmission.update({ where: { id: secondRow.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await (await request(root)).json() as { currentStatus: string }).currentStatus, "EXPIRED",
      "overdue approval becomes expired and remains independently reviewable in history");
    assert.equal(await prisma.securityAuditEvent.count({ where: { targetId: secondRow.id, eventType: "FIRM_VERIFICATION_EXPIRED" } }), 1,
      "system expiry transition is audited");
    const history = await request(`${adminRoot}?status=ALL&pageSize=100`, "GET", 2);
    const historyJson = await history.json() as { pagination: { total: number; totalPages: number }; submissions: Array<{ id: string }> };
    assert.ok(historyJson.pagination.total >= 2, "review history includes existing and fixture records");
    let historySubmissions = historyJson.submissions;
    if (![first.id, secondRow.id].every((id) => historySubmissions.some((submission) => submission.id === id))
      && historyJson.pagination.totalPages > 1) {
      const lastPage = await request(`${adminRoot}?status=ALL&page=${historyJson.pagination.totalPages}&pageSize=100`, "GET", 2);
      assert.equal(lastPage.status, 200);
      historySubmissions = (await lastPage.json() as typeof historyJson).submissions;
    }
    assert.ok([first.id, secondRow.id].every((id) => historySubmissions.some((submission) => submission.id === id)),
      "review history includes both fixture revisions");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: { in: requestIds } } }) >= 6, true,
      "submission, document, and review changes are audited");
  } finally {
    await app?.close();
    if (fixturesCreated) {
      const submissions = await prisma.firmVerificationSubmission.findMany({ where: { workspaceId: { in: workspaceIds } },
        select: { id: true, documents: { select: { storageKey: true } } } });
      await Promise.all(submissions.flatMap((submission) => submission.documents.map((document) => storage.remove(document.storageKey))));
      await prisma.$transaction(async (tx) => {
        await tx.firmVerificationDocument.deleteMany({ where: { submissionId: { in: submissions.map((submission) => submission.id) } } });
        await tx.firmVerificationSubmission.deleteMany({ where: { id: { in: submissions.map((submission) => submission.id) } } });
        await tx.securityAuditEvent.deleteMany({ where: { OR: [
          { requestId: { in: requestIds } },
          { actorUserId: { in: userIds } },
          { targetId: { in: submissions.map((submission) => submission.id) } },
        ] } });
        await tx.platformRoleGrant.deleteMany({ where: { userId: { in: userIds } } });
        await tx.userSession.deleteMany({ where: { userId: { in: userIds } } });
        await tx.practiceMembership.deleteMany({ where: { id: { in: membershipIds } } });
        await tx.practiceWorkspace.deleteMany({ where: { id: { in: workspaceIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      });
    }
    await prisma.$disconnect();
  }
});
