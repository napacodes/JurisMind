import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { BadRequestException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PlatformAdminModule } from "../src/platform-admin/platform-admin.module";
import { AUTH_ENVIRONMENT } from "../src/auth/auth.types";
import type { AuthEnvironment } from "../src/auth/auth.types";
import { sessionCookieName } from "../src/auth/session-cookie";
import { hashSessionToken } from "../src/auth/auth.service";
import { configureCors } from "../src/config/cors";
import { PrismaService } from "../src/database/prisma.service";
import { parseContentInput, parseContentUpdate } from "../src/platform-admin/content.dto";

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (parsed.pathname.slice(1) !== "jurismind_auth_test" || !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("Safety stop: CMS integration tests require local jurismind_auth_test.");
  }
}

const input = { type: "BLOG_POST", slug: "cms-test-post", title: "Synthetic content", summary: "Test summary.",
  body: "<script>safe text</script>\nSecond paragraph.", seoTitle: null, seoDescription: null };

test("CMS input validates normalized slugs and retains plain text for escaped rendering", () => {
  assert.equal(parseContentInput({ ...input, slug: "  CMS Test Post " }).slug, "cms-test-post");
  assert.equal(parseContentInput(input).body, input.body);
  for (const slug of ["../secret", "bad--slug", "slug?x=1", "x".repeat(121)]) {
    assert.throws(() => parseContentInput({ ...input, slug }), BadRequestException);
  }
  assert.throws(() => parseContentInput({ ...input, status: "PUBLISHED" }), BadRequestException);
  assert.throws(() => parseContentInput({ ...input, body: "" }), BadRequestException);
  assert.throws(() => parseContentUpdate({ ...input }), BadRequestException);
});

test("CMS management is Super Admin-only and public reads follow audited publication lifecycle", {
  skip: !databaseUrl ? "Set AUTH_TEST_DATABASE_URL to local jurismind_auth_test." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const environment: AuthEnvironment = { nodeEnv: "test", trustedOrigins: ["http://localhost:3000"], sessionTtlSeconds: 3600,
    passwordMinLength: 12, loginRateLimitMax: 5, loginRateLimitWindowSeconds: 900, invitationDevTokenDelivery: false,
    mfaEncryptionKey: Buffer.alloc(32, 1), lawyerCredentialEncryptionKey: Buffer.alloc(32, 2) };
  const actorIds = [randomUUID(), randomUUID()];
  const sessionIds = [randomUUID(), randomUUID()];
  const tokens = sessionIds.map(() => randomBytes(32).toString("base64url"));
  const emails = actorIds.map((_, index) => `cms-test-${index}-${randomUUID()}@example.invalid`);
  const cookieName = sessionCookieName(environment);
  const origin = environment.trustedOrigins[0]!;
  let app: INestApplication | undefined;
  let baseUrl = "";
  const failFunction = `cms_fail_audit_${randomUUID().replaceAll("-", "")}`;
  let auditTriggerCreated = false;
  const request = (path: string, method = "GET", actor: number | null = 0, body?: unknown) => {
    const headers = new Headers({ origin });
    if (actor !== null) headers.set("cookie", `${cookieName}=${tokens[actor]}`);
    if (body !== undefined) headers.set("content-type", "application/json");
    return fetch(`${baseUrl}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  };
  try {
    await prisma.$connect();
    assert.equal((await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`)[0]?.name, "jurismind_auth_test");
    await prisma.user.createMany({ data: actorIds.map((id, index) => ({ id, email: emails[index]!, emailNormalized: emails[index]!, fullName: `Synthetic CMS ${index}` })) });
    await prisma.platformRoleGrant.create({ data: { id: randomUUID(), userId: actorIds[0]!, role: "SUPER_ADMIN" } });
    await prisma.userSession.createMany({ data: sessionIds.map((id, index) => ({ id, userId: actorIds[index]!, tokenHash: hashSessionToken(tokens[index]!), expiresAt: new Date(Date.now() + 3600_000) })) });
    const module = await Test.createTestingModule({ imports: [PlatformAdminModule] }).overrideProvider(PrismaService).useValue(prisma)
      .overrideProvider(AUTH_ENVIRONMENT).useValue(environment).compile();
    app = module.createNestApplication({ logger: false }); configureCors(app, environment.trustedOrigins); await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address(); assert.ok(address && typeof address !== "string"); baseUrl = `http://127.0.0.1:${address.port}`;

    assert.equal((await request("/api/platform-admin/content", "GET", 1)).status, 403);
    assert.equal((await request("/api/platform-admin/content", "GET", null)).status, 401);
    const createdResponse = await request("/api/platform-admin/content", "POST", 0, input);
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json() as { id: string; status: string; updatedAt: string };
    assert.equal(created.status, "DRAFT");
    assert.equal((await request("/api/public/content/cms-test-post")).status, 404);
    assert.equal((await request(`/api/platform-admin/content/${created.id}/preview`)).status, 200);
    assert.equal((await request(`/api/platform-admin/content/${created.id}/preview`, "GET", 1)).status, 403);
    assert.equal((await request(`/api/platform-admin/content/${created.id}/preview`, "GET", null)).status, 401);
    assert.equal((await request("/api/platform-admin/content", "POST", 0, input)).status, 409);

    const edited = { ...input, title: "Updated synthetic content", expectedUpdatedAt: created.updatedAt };
    const editedResponse = await request(`/api/platform-admin/content/${created.id}`, "PATCH", 0, edited);
    assert.equal(editedResponse.status, 200);
    assert.equal((await request(`/api/platform-admin/content/${created.id}`, "PATCH", 0, edited)).status, 409,
      "stale editors must not overwrite a newer revision");
    await prisma.$executeRawUnsafe(`CREATE FUNCTION ${failFunction}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type = 'CONTENT_PUBLISHED' AND NEW.target_id = '${created.id}' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER ${failFunction} BEFORE INSERT ON security_audit_events FOR EACH ROW EXECUTE FUNCTION ${failFunction}()`);
    auditTriggerCreated = true;
    assert.equal((await request(`/api/platform-admin/content/${created.id}/publish`, "POST")).status, 500);
    assert.equal((await prisma.contentEntry.findUniqueOrThrow({ where: { id: created.id } })).status, "DRAFT",
      "the status mutation must roll back when audit persistence fails");
    await prisma.$executeRawUnsafe(`DROP TRIGGER ${failFunction} ON security_audit_events`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION ${failFunction}()`);
    auditTriggerCreated = false;

    assert.equal((await request(`/api/platform-admin/content/${created.id}/publish`, "POST")).status, 201);
    const publicResponse = await request("/api/public/content/cms-test-post"); assert.equal(publicResponse.status, 200);
    assert.equal(publicResponse.headers.get("cache-control"), "no-store");
    const publicEntry = await publicResponse.json() as { status: string; body: string };
    assert.equal(publicEntry.status, "PUBLISHED"); assert.equal(publicEntry.body, input.body);
    assert.equal((await request(`/api/platform-admin/content/${created.id}/unpublish`, "POST")).status, 201);
    assert.equal((await request("/api/public/content/cms-test-post")).status, 404);
    assert.equal((await request(`/api/platform-admin/content/${created.id}/archive`, "POST")).status, 201);
    assert.equal((await request("/api/public/content/cms-test-post")).status, 404);
    const audit = await prisma.securityAuditEvent.findMany({ where: { actorUserId: actorIds[0]!, targetId: created.id }, select: { eventType: true } });
    assert.deepEqual(new Set(audit.map((event) => event.eventType)), new Set(["CONTENT_CREATED", "CONTENT_UPDATED", "CONTENT_PUBLISHED", "CONTENT_UNPUBLISHED", "CONTENT_ARCHIVED"]));
  } finally {
    if (app) await app.close();
    if (databaseUrl) await prisma.$transaction(async (tx) => {
      if (auditTriggerCreated) {
        await tx.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${failFunction} ON security_audit_events`);
        await tx.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${failFunction}()`);
      }
      await tx.contentEntry.deleteMany({ where: { createdById: { in: actorIds } } });
      await tx.securityAuditEvent.deleteMany({ where: { actorUserId: { in: actorIds } } });
      await tx.userSession.deleteMany({ where: { userId: { in: actorIds } } });
      await tx.platformRoleGrant.deleteMany({ where: { userId: { in: actorIds } } });
      await tx.user.deleteMany({ where: { id: { in: actorIds } } });
    }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
