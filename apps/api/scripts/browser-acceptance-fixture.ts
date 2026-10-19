import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PasswordHasherService } from "../src/auth/password-hasher.service";

/**
 * Local browser-acceptance fixtures for jurismind_auth_test only.
 *
 * The Super Admin fixture intentionally holds no practice membership, so platform
 * administration can be exercised without practice authorization masking the result.
 * The lawyer fixture is deliberately bare: the individual-practice workspace is created
 * through the real provisioning flow during acceptance.
 *
 * Passwords come from the process environment and are never printed. Supply them from an
 * ignored local file, for example: set -a; . ../../.env.browser-acceptance.local; set +a
 */

const expectedDatabase = "jurismind_auth_test";

type FixtureSpec = {
  email: string;
  fullName: string;
  passwordVariable: "ACCEPTANCE_SUPER_ADMIN_PASSWORD" | "ACCEPTANCE_LAWYER_PASSWORD";
  superAdmin: boolean;
};

const fixtures: readonly FixtureSpec[] = [
  {
    email: "jurismind-acceptance-superadmin@example.invalid",
    fullName: "JurisMind Acceptance Super Admin",
    passwordVariable: "ACCEPTANCE_SUPER_ADMIN_PASSWORD",
    superAdmin: true,
  },
  {
    email: "jurismind-acceptance-lawyer@example.invalid",
    fullName: "JurisMind Acceptance Lawyer",
    passwordVariable: "ACCEPTANCE_LAWYER_PASSWORD",
    superAdmin: false,
  },
];

function requiredTestUrl(name: "DATABASE_URL" | "AUTH_TEST_DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set for the isolated acceptance fixture command.`);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL.`);
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !["localhost", "127.0.0.1", "::1"].includes(hostname) ||
    decodeURIComponent(parsed.pathname.slice(1)) !== expectedDatabase
  ) {
    throw new Error(`Safety stop: ${name} must target local ${expectedDatabase} exactly.`);
  }
  return value;
}

function requiredPassword(name: FixtureSpec["passwordVariable"]): string {
  const value = process.env[name];
  if (!value || value.length < 12 || value.length > 64) {
    throw new Error(`Set ${name} to a test-only password of 12-64 characters; its value is never printed.`);
  }
  return value;
}

const runtimeUrl = requiredTestUrl("DATABASE_URL");
const testUrl = requiredTestUrl("AUTH_TEST_DATABASE_URL");
const runtime = new PrismaClient({ adapter: new PrismaPg({ connectionString: runtimeUrl }) });
const testClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: testUrl }) });

async function assertIsolatedDatabase(): Promise<void> {
  const [runtimeName, testName] = await Promise.all([
    runtime.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`,
    testClient.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`,
  ]);
  if (
    runtimeName[0]?.name !== expectedDatabase ||
    testName[0]?.name !== expectedDatabase ||
    runtimeName[0].name !== testName[0].name
  ) {
    throw new Error("Safety stop: both configured connections must resolve to the isolated acceptance database.");
  }
}

async function cleanup(): Promise<void> {
  const specs = [...fixtures].reverse();
  for (const spec of specs) {
    const user = await testClient.user.findUnique({ where: { emailNormalized: spec.email }, select: { id: true, fullName: true } });
    if (!user) continue;
    if (user.fullName !== spec.fullName) throw new Error("Safety stop: a reserved acceptance identity is owned by another record.");
    // Only workspaces whose entire membership belongs to this fixture are removed, so an
    // unrelated firm workspace can never be deleted by a cleanup run.
    const ownedWorkspaces = await testClient.practiceWorkspace.findMany({
      where: { kind: "INDIVIDUAL", memberships: { every: { userId: user.id } } },
      select: { id: true, memberships: { select: { id: true } } },
    });
    const membershipIds = ownedWorkspaces.flatMap((workspace) => workspace.memberships.map((membership) => membership.id));
    const workspaceIds = ownedWorkspaces.map((workspace) => workspace.id);
    await testClient.$transaction(async (tx) => {
      await tx.workspaceInvitation.deleteMany({
        where: workspaceIds.length
          ? { OR: [{ recipientUserId: user.id }, { createdById: user.id }, { workspaceId: { in: workspaceIds } }] }
          : { OR: [{ recipientUserId: user.id }, { createdById: user.id }] },
      });
      await tx.lawyerCredentialDocument.deleteMany({
        where: membershipIds.length ? { membershipId: { in: membershipIds } } : { id: { in: [] } },
      });
      await tx.lawyerCredentialSubmission.deleteMany({
        where: membershipIds.length
          ? { OR: [{ membershipId: { in: membershipIds } }, { reviewedById: user.id }] }
          : { reviewedById: user.id },
      });
      await tx.lawyerProfile.deleteMany({ where: membershipIds.length ? { membershipId: { in: membershipIds } } : { id: { in: [] } } });
      await tx.practiceMembership.deleteMany({ where: membershipIds.length ? { id: { in: membershipIds } } : { id: { in: [] } } });
      await tx.securityAuditEvent.deleteMany({
        where: workspaceIds.length ? { OR: [{ actorUserId: user.id }, { workspaceId: { in: workspaceIds } }] } : { actorUserId: user.id },
      });
      await tx.contentEntry.deleteMany({ where: { OR: [{ createdById: user.id }, { updatedById: user.id }] } });
      if (workspaceIds.length) await tx.practiceWorkspace.deleteMany({ where: { id: { in: workspaceIds } } });
      await tx.platformRoleGrant.deleteMany({ where: { OR: [{ userId: user.id }, { grantedById: user.id }] } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.loginMfaChallenge.deleteMany({ where: { userId: user.id } });
      await tx.userSession.deleteMany({ where: { userId: user.id } });
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: user.id } });
      await tx.userMfa.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });
    console.log(`Removed acceptance fixture ${user.id}.`);
  }
  console.log(`Acceptance fixtures cleared from ${expectedDatabase}.`);
}

async function provision(): Promise<void> {
  const hasher = new PasswordHasherService();
  for (const spec of fixtures) {
    const existing = await testClient.user.findUnique({ where: { emailNormalized: spec.email }, select: { id: true, fullName: true } });
    if (existing && existing.fullName !== spec.fullName) {
      throw new Error("Safety stop: a reserved acceptance identity is owned by another record.");
    }
    const passwordHash = await hasher.hash(requiredPassword(spec.passwordVariable), 12);
    const user = await testClient.$transaction(async (tx) => {
      const saved = await tx.user.upsert({
        where: { emailNormalized: spec.email },
        create: { email: spec.email, emailNormalized: spec.email, fullName: spec.fullName, passwordHash },
        update: { email: spec.email, fullName: spec.fullName, passwordHash, status: "ACTIVE", emailVerifiedAt: null },
        select: { id: true, emailNormalized: true, status: true },
      });
      await tx.userSession.deleteMany({ where: { userId: saved.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: saved.id } });
      await tx.loginMfaChallenge.deleteMany({ where: { userId: saved.id } });
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: saved.id } });
      await tx.userMfa.deleteMany({ where: { userId: saved.id } });
      if (spec.superAdmin) {
        const granted = await tx.platformRoleGrant.count({ where: { userId: saved.id, role: "SUPER_ADMIN", revokedAt: null } });
        if (!granted) await tx.platformRoleGrant.create({ data: { userId: saved.id, role: "SUPER_ADMIN" } });
      }
      return saved;
    });
    const memberships = await testClient.practiceMembership.count({ where: { userId: user.id } });
    console.log(`${user.emailNormalized} (${user.status}) ready in ${expectedDatabase}; practice memberships: ${memberships}; platform grant: ${spec.superAdmin ? "SUPER_ADMIN" : "none"}.`);
  }
}

if (process.argv.includes("--cleanup")) {
  cleanup()
    .catch(() => {
      console.error("Acceptance fixture cleanup failed. Review the failure locally; no connection values were displayed.");
      process.exitCode = 1;
    })
    .finally(async () => {
      await Promise.all([runtime.$disconnect(), testClient.$disconnect()]);
    });
} else {
  assertIsolatedDatabase()
    .then(provision)
    .catch(() => {
      console.error("Acceptance fixture setup failed. Review the failure locally; no credentials were displayed.");
      process.exitCode = 1;
    })
    .finally(async () => {
      await Promise.all([runtime.$disconnect(), testClient.$disconnect()]);
    });
}
