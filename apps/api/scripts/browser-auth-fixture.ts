import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PasswordHasherService } from "../src/auth/password-hasher.service";

const fixtureEmail = "jurismind-browser-acceptance@example.invalid";
const fixtureName = "JurisMind Synthetic Browser Test";
const expectedDatabase = "jurismind_auth_test";

function requiredTestUrl(name: "DATABASE_URL" | "AUTH_TEST_DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set for the isolated browser fixture command.`);
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid PostgreSQL URL.`); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || decodeURIComponent(parsed.pathname.slice(1)) !== expectedDatabase) {
    throw new Error(`Safety stop: ${name} must target ${expectedDatabase} exactly.`);
  }
  return value;
}

const runtimeUrl = requiredTestUrl("DATABASE_URL");
const testUrl = requiredTestUrl("AUTH_TEST_DATABASE_URL");
const runtime = new PrismaClient({ adapter: new PrismaPg({ connectionString: runtimeUrl }) });
const testClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: testUrl }) });

async function main(): Promise<void> {
  await Promise.all([runtime.$connect(), testClient.$connect()]);
  const [runtimeName, testName] = await Promise.all([
    runtime.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`,
    testClient.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`,
  ]);
  if (runtimeName[0]?.name !== expectedDatabase || testName[0]?.name !== expectedDatabase || runtimeName[0].name !== testName[0].name) {
    throw new Error("Safety stop: both configured connections must resolve to the isolated browser-test database.");
  }

  const existing = await testClient.user.findUnique({ where: { emailNormalized: fixtureEmail } });
  if (existing && existing.fullName !== fixtureName) throw new Error("Safety stop: the reserved synthetic fixture identity is already owned by another record.");
  if (existing && !process.argv.includes("--cleanup")) {
    const [memberships, grants, invitations] = await Promise.all([
      testClient.practiceMembership.count({ where: { userId: existing.id } }),
      testClient.platformRoleGrant.count({ where: { userId: existing.id } }),
      testClient.workspaceInvitation.count({ where: { OR: [{ recipientUserId: existing.id }, { createdById: existing.id }] } }),
    ]);
    if (memberships || grants || invitations) throw new Error("Safety stop: fixture provisioning will not modify an identity referenced by workspace or platform authorization records.");
  }

  if (process.argv.includes("--cleanup")) {
    if (!existing) return;
    const [memberships, grants, invitations] = await Promise.all([
      testClient.practiceMembership.count({ where: { userId: existing.id } }),
      testClient.platformRoleGrant.count({ where: { OR: [{ userId: existing.id }, { grantedById: existing.id }] } }),
      testClient.workspaceInvitation.count({ where: { OR: [{ recipientUserId: existing.id }, { createdById: existing.id }] } }),
    ]);
    if (memberships || grants || invitations) throw new Error("Safety stop: fixture cleanup will not remove an identity referenced by workspace or platform authorization records.");
    await testClient.$transaction(async (tx) => {
      await tx.securityAuditEvent.deleteMany({ where: { actorUserId: existing.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: existing.id } });
      await tx.loginMfaChallenge.deleteMany({ where: { userId: existing.id } });
      await tx.userSession.deleteMany({ where: { userId: existing.id } });
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: existing.id } });
      await tx.userMfa.deleteMany({ where: { userId: existing.id } });
      await tx.user.delete({ where: { id: existing.id } });
    });
    console.log("Synthetic browser fixture cleaned up from jurismind_auth_test.");
    return;
  }

  const password = process.env.BROWSER_TEST_PASSWORD;
  if (!password || password.length < 12 || password.length > 64) {
    throw new Error("Set BROWSER_TEST_PASSWORD to a test-only password of 12–64 characters; its value is never printed.");
  }
  const hasher = new PasswordHasherService();
  const passwordHash = await hasher.hash(password, 12);
  const user = await testClient.$transaction(async (tx) => {
    const saved = await tx.user.upsert({
      where: { emailNormalized: fixtureEmail },
      create: { email: fixtureEmail, emailNormalized: fixtureEmail, fullName: fixtureName, passwordHash },
      update: { email: fixtureEmail, fullName: fixtureName, passwordHash, status: "ACTIVE", emailVerifiedAt: null },
      select: { id: true, emailNormalized: true, fullName: true, status: true },
    });
    await tx.userSession.deleteMany({ where: { userId: saved.id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: saved.id } });
    await tx.loginMfaChallenge.deleteMany({ where: { userId: saved.id } });
    await tx.mfaRecoveryCode.deleteMany({ where: { userId: saved.id } });
    await tx.userMfa.deleteMany({ where: { userId: saved.id } });
    return saved;
  });
  console.log(`Synthetic browser fixture ready in ${expectedDatabase}: ${user.emailNormalized} (${user.status}).`);
}

main().catch((error: unknown) => {
  void error;
  console.error("Browser fixture setup failed. Review the failure locally without exposing environment values.");
  process.exitCode = 1;
}).finally(async () => {
  await Promise.all([runtime.$disconnect(), testClient.$disconnect()]);
});
