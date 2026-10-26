import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { ConflictException } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { AuthEnvironment } from "../src/auth/auth.types";
import { parseAccountRegistration } from "../src/auth/registration.dto";
import { LoginRateLimiterService } from "../src/auth/login-rate-limiter.service";
import { PasswordHasherService } from "../src/auth/password-hasher.service";
import { RegistrationService } from "../src/auth/registration.service";

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (databaseUrl && new URL(databaseUrl).pathname.slice(1) !== "jurismind_auth_test") {
  throw new Error("Safety stop: registration integration tests require jurismind_auth_test.");
}

test("firm and lawyer registration persist their authorized initial workspace atomically", {
  skip: !databaseUrl ? "Set AUTH_TEST_DATABASE_URL to the dedicated jurismind_auth_test database." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const environment = {
    nodeEnv: "development", trustedOrigins: ["http://localhost:3000"], sessionTtlSeconds: 3600,
    passwordMinLength: 12, loginRateLimitMax: 5, loginRateLimitWindowSeconds: 900,
    invitationDevTokenDelivery: false,
  } satisfies AuthEnvironment;
  const registration = new RegistrationService(prisma as never, new PasswordHasherService(),
    new LoginRateLimiterService(environment), environment);
  const userIds: string[] = [];

  try {
    await prisma.$connect();
    const [{ name }] = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    assert.equal(name, "jurismind_auth_test", "registration tests must never use jurismind_dev");

    const firmEmail = `firm-${randomUUID()}@example.invalid`;
    const firm = await registration.register("firm", parseAccountRegistration({ fullName: "Firm Admin", email: firmEmail,
      password: "test-password-12", firmName: "Phase 1 Firm" }, "firm"), "127.0.0.1", randomUUID());
    userIds.push(firm.user.id);
    const firmMembership = await prisma.practiceMembership.findFirstOrThrow({ where: { userId: firm.user.id }, include: { workspace: true, user: true } });
    assert.equal(firmMembership.role, "FIRM_ADMIN");
    assert.equal(firmMembership.status, "ACTIVE");
    assert.equal(firmMembership.workspace.kind, "FIRM");
    assert.notEqual(firmMembership.user.passwordHash, "test-password-12");
    assert.equal(await prisma.platformRoleGrant.count({ where: { userId: firm.user.id } }), 0,
      "Firm Admin registration never grants platform administration");
    assert.equal((await prisma.userSession.findFirstOrThrow({ where: { userId: firm.user.id } })).tokenHash.length, 64);

    await assert.rejects(registration.register("firm", parseAccountRegistration({ fullName: "Duplicate", email: firmEmail,
      password: "test-password-12", firmName: "Other Firm" }, "firm"), "127.0.0.1", randomUUID()), ConflictException);
    assert.equal(await prisma.user.count({ where: { emailNormalized: firmEmail } }), 1);

    const lawyerEmail = `lawyer-${randomUUID()}@example.invalid`;
    const lawyer = await registration.register("lawyer", parseAccountRegistration({ fullName: "Lawyer", email: lawyerEmail,
      password: "test-password-12" }, "lawyer"), "127.0.0.1", randomUUID());
    userIds.push(lawyer.user.id);
    const lawyerMembership = await prisma.practiceMembership.findFirstOrThrow({ where: { userId: lawyer.user.id }, include: { workspace: true, lawyerProfile: true } });
    assert.equal(lawyerMembership.role, "LAWYER");
    assert.equal(lawyerMembership.status, "ACTIVE");
    assert.equal(lawyerMembership.workspace.kind, "INDIVIDUAL");
    assert.equal(lawyerMembership.lawyerProfile?.isPrimary, true);
    assert.ok(firm.rawSessionToken !== lawyer.rawSessionToken);
  } finally {
    if (userIds.length) {
      await prisma.$transaction(async (tx) => {
        await tx.securityAuditEvent.deleteMany({ where: { actorUserId: { in: userIds } } });
        const memberships = await tx.practiceMembership.findMany({ where: { userId: { in: userIds } }, select: { id: true, workspaceId: true } });
        await tx.lawyerProfile.deleteMany({ where: { membershipId: { in: memberships.map((membership) => membership.id) } } });
        await tx.practiceMembership.deleteMany({ where: { id: { in: memberships.map((membership) => membership.id) } } });
        await tx.userSession.deleteMany({ where: { userId: { in: userIds } } });
        await tx.practiceWorkspace.deleteMany({ where: { id: { in: memberships.map((membership) => membership.workspaceId) } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      });
    }
    await prisma.$disconnect();
  }
});
