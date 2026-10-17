const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("BLOCKED: DATABASE_URL is required; see apps/api/.env.example.");
  process.exit(2);
}

const client = new Client({
  connectionString: databaseUrl,
  application_name: "jurismind-phase-1-2-rollback-verification",
});
const runId = randomUUID().replaceAll("-", "").slice(0, 12);
let generatedUserCount = 0;
let generatedWorkspaceCount = 0;
let transactionOpen = false;
let savepointCount = 0;

function reportPass(label, detail) {
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

async function expectRejected(label, operation, expected = {}) {
  const savepoint = `phase12_expected_failure_${++savepointCount}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  let failure;

  try {
    await operation();
  } catch (error) {
    failure = error;
  }

  await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  await client.query(`RELEASE SAVEPOINT ${savepoint}`);

  if (!failure) {
    const error = new Error(`${label}: invalid database operation unexpectedly succeeded`);
    error.testLabel = label;
    throw error;
  }

  if (expected.constraint && failure.constraint !== expected.constraint) {
    const error = new Error(`${label}: rejected by an unexpected constraint`);
    error.testLabel = label;
    error.sqlState = failure.code;
    throw error;
  }

  if (expected.code && failure.code !== expected.code) {
    const error = new Error(`${label}: rejected with an unexpected SQLSTATE`);
    error.testLabel = label;
    error.sqlState = failure.code;
    throw error;
  }

  if (!expected.constraint && !expected.code && !failure.code?.startsWith("23") && failure.code !== "P0001") {
    const error = new Error(`${label}: operation failed for a reason other than a database constraint`);
    error.testLabel = label;
    error.sqlState = failure.code;
    throw error;
  }

  reportPass(label, `rejected (${failure.constraint ?? failure.code})`);
}

async function insertUser(label) {
  const id = randomUUID();
  const email = `phase12-${runId}-${++generatedUserCount}-${label}@example.invalid`;
  await client.query(
    `INSERT INTO "users" ("id", "email", "email_normalized", "full_name", "updated_at")
     VALUES ($1, $2, $3, $4, now())`,
    [id, email, email.toLowerCase(), `Phase 1.2 Test ${label}`],
  );
  return id;
}

async function insertWorkspace(kind, label) {
  const id = randomUUID();
  const suffix = `${runId}-${++generatedWorkspaceCount}-${label}`;
  await client.query(
    `INSERT INTO "practice_workspaces" ("id", "name", "slug", "kind", "updated_at")
     VALUES ($1, $2, $3, $4, now())`,
    [id, `Phase 1.2 ${label}`, `phase12-${suffix}`, kind],
  );
  return id;
}

async function insertMembership({ workspaceId, userId, role, status = "ACTIVE", supervisorId = null }) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO "practice_memberships"
       ("id", "workspace_id", "user_id", "role", "status", "supervising_lawyer_membership_id", "joined_at", "updated_at")
     VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $5::\"MembershipStatus\" = 'ACTIVE' THEN now() ELSE NULL END, now())`,
    [id, workspaceId, userId, role, status, supervisorId],
  );
  return id;
}

async function insertLawyerProfile({ workspaceId, membershipId, isPrimary = false }) {
  await client.query(
    `INSERT INTO "lawyer_profiles" ("id", "workspace_id", "membership_id", "is_primary", "updated_at")
     VALUES ($1, $2, $3, $4, now())`,
    [randomUUID(), workspaceId, membershipId, isPrimary],
  );
}

async function verifyCatalog() {
  const migrationRows = await client.query(
    `SELECT "migration_name", "finished_at", "rolled_back_at"
     FROM "_prisma_migrations"
     WHERE "migration_name" = ANY($1::text[])`,
    [[
      "20261015130000_identity_workspace_foundation",
      "20261015150000_individual_primary_lawyer",
    ]],
  );
  const migrations = new Map(migrationRows.rows.map((row) => [row.migration_name, row]));
  for (const name of [
    "20261015130000_identity_workspace_foundation",
    "20261015150000_individual_primary_lawyer",
  ]) {
    assert.ok(migrations.has(name), `Applied migration is missing: ${name}`);
    assert.ok(migrations.get(name).finished_at, `Migration is not finished: ${name}`);
    assert.equal(migrations.get(name).rolled_back_at, null, `Migration was rolled back: ${name}`);
  }
  reportPass("both Prisma migrations are recorded as applied");

  const constraints = await client.query(
    `SELECT c."conname", c."contype", pg_get_constraintdef(c."oid") AS definition
     FROM pg_constraint c
     JOIN pg_namespace n ON n."oid" = c."connamespace"
     WHERE n."nspname" = 'public'`,
  );
  const constraintMap = new Map(constraints.rows.map((row) => [row.conname, row]));
  const expectedConstraints = [
    ["practice_memberships_workspace_id_fkey", "f"],
    ["practice_memberships_user_id_fkey", "f"],
    ["practice_memberships_supervising_lawyer_membership_id_work_fkey", "f"],
    ["lawyer_profiles_membership_id_workspace_id_fkey", "f"],
    ["platform_role_grants_user_id_fkey", "f"],
    ["platform_role_grants_granted_by_id_fkey", "f"],
    ["user_sessions_user_id_fkey", "f"],
    ["security_audit_events_actor_user_id_fkey", "f"],
    ["security_audit_events_workspace_id_fkey", "f"],
    ["users_email_normalized_lowercase_check", "c"],
    ["practice_memberships_supervisor_role_check", "c"],
    ["user_sessions_token_hash_hex_check", "c"],
    ["user_sessions_expiry_check", "c"],
  ];
  for (const [name, type] of expectedConstraints) {
    assert.equal(constraintMap.get(name)?.contype, type, `Expected constraint missing: ${name}`);
  }
  const supervisorFk = constraintMap.get(
    "practice_memberships_supervising_lawyer_membership_id_work_fkey",
  );
  assert.match(supervisorFk.definition, /supervising_lawyer_membership_id, workspace_id/);
  assert.match(supervisorFk.definition, /REFERENCES practice_memberships\(id, workspace_id\)/);
  reportPass("foreign keys and check constraints are installed, including the same-workspace supervisor FK");

  const indexes = await client.query(
    `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`,
  );
  const indexMap = new Map(indexes.rows.map((row) => [row.indexname, row.indexdef]));
  for (const name of [
    "users_email_normalized_key",
    "practice_workspaces_slug_key",
    "practice_memberships_workspace_id_user_id_key",
    "practice_memberships_id_workspace_id_key",
    "lawyer_profiles_membership_id_key",
    "lawyer_profiles_membership_id_workspace_id_key",
    "lawyer_profiles_one_primary_per_workspace_idx",
    "platform_role_grants_one_active_role_idx",
    "user_sessions_token_hash_key",
  ]) {
    assert.ok(indexMap.has(name), `Expected index missing: ${name}`);
  }
  assert.match(indexMap.get("lawyer_profiles_one_primary_per_workspace_idx"), /WHERE \(is_primary = true\)/i);
  assert.match(indexMap.get("platform_role_grants_one_active_role_idx"), /WHERE \(revoked_at IS NULL\)/i);
  reportPass("unique indexes are installed, including partial primary-lawyer and active-platform-role indexes");

  const triggerRows = await client.query(
    `SELECT t.tgname, c.relname AS table_name, t.tgdeferrable, t.tginitdeferred
     FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND NOT t.tgisinternal`,
  );
  const triggerMap = new Map(triggerRows.rows.map((row) => [row.tgname, row]));
  for (const name of [
    "practice_memberships_invariants_trigger",
    "lawyer_profiles_role_trigger",
    "practice_workspaces_kind_trigger",
    "practice_workspaces_primary_lawyer_constraint",
    "lawyer_profiles_primary_lawyer_constraint",
  ]) {
    assert.ok(triggerMap.has(name), `Expected trigger missing: ${name}`);
  }
  for (const name of [
    "practice_workspaces_primary_lawyer_constraint",
    "lawyer_profiles_primary_lawyer_constraint",
  ]) {
    assert.equal(triggerMap.get(name).tgdeferrable, true, `Trigger is not deferrable: ${name}`);
    assert.equal(triggerMap.get(name).tginitdeferred, true, `Trigger is not initially deferred: ${name}`);
  }
  reportPass("membership/profile/workspace triggers are installed, including deferred primary-lawyer checks");
}

async function runConstraintTests() {
  await client.query("BEGIN");
  transactionOpen = true;

  const firmId = await insertWorkspace("FIRM", "firm");
  const firmLawyers = [];
  for (const label of ["firm-lawyer-a", "firm-lawyer-b", "firm-lawyer-c"]) {
    const userId = await insertUser(label);
    const membershipId = await insertMembership({ workspaceId: firmId, userId, role: "LAWYER" });
    await insertLawyerProfile({ workspaceId: firmId, membershipId });
    firmLawyers.push(membershipId);
  }
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  assert.equal(firmLawyers.length, 3);
  await client.query("SET CONSTRAINTS ALL DEFERRED");
  reportPass("firm accepts multiple active lawyers and profiles");

  const individualId = await insertWorkspace("INDIVIDUAL", "individual");
  const primaryUser = await insertUser("individual-primary");
  const primaryLawyerId = await insertMembership({
    workspaceId: individualId,
    userId: primaryUser,
    role: "LAWYER",
  });
  await insertLawyerProfile({
    workspaceId: individualId,
    membershipId: primaryLawyerId,
    isPrimary: true,
  });
  const assistantUser = await insertUser("individual-assistant");
  const assistantId = await insertMembership({
    workspaceId: individualId,
    userId: assistantUser,
    role: "ASSISTANT",
    supervisorId: primaryLawyerId,
  });
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  const individualResult = await client.query(
    `SELECT membership."role", membership."status", membership."supervising_lawyer_membership_id",
            profile."is_primary"
     FROM "practice_memberships" membership
     LEFT JOIN "lawyer_profiles" profile ON profile."membership_id" = membership."id"
     WHERE membership."id" = $1`,
    [primaryLawyerId],
  );
  assert.equal(individualResult.rows[0]?.role, "LAWYER");
  assert.equal(individualResult.rows[0]?.is_primary, true);
  const assistantResult = await client.query(
    `SELECT "role", "status", "supervising_lawyer_membership_id"
     FROM "practice_memberships" WHERE "id" = $1`,
    [assistantId],
  );
  assert.equal(assistantResult.rows[0]?.role, "ASSISTANT");
  assert.equal(assistantResult.rows[0]?.supervising_lawyer_membership_id, primaryLawyerId);
  await client.query("SET CONSTRAINTS ALL DEFERRED");
  reportPass("individual workspace, primary lawyer, and active assistant are valid in one transaction");

  await expectRejected("individual workspace cannot commit without a primary lawyer", async () => {
    await insertWorkspace("INDIVIDUAL", "missing-primary");
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  }, { code: "P0001" });

  await expectRejected("individual workspace rejects a second active lawyer membership", async () => {
    const extraUser = await insertUser("individual-extra-lawyer");
    await insertMembership({ workspaceId: individualId, userId: extraUser, role: "LAWYER" });
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    await client.query("SET CONSTRAINTS ALL DEFERRED");
  }, { code: "P0001" });

  const primaryIndexSavepoint = `phase12_primary_index_${++savepointCount}`;
  await client.query(`SAVEPOINT ${primaryIndexSavepoint}`);
  await client.query(`UPDATE "practice_workspaces" SET "kind" = 'FIRM' WHERE "id" = $1`, [individualId]);
  const extraLawyerUser = await insertUser("primary-index-lawyer");
  const extraLawyerId = await insertMembership({
    workspaceId: individualId,
    userId: extraLawyerUser,
    role: "LAWYER",
  });
  await insertLawyerProfile({ workspaceId: individualId, membershipId: extraLawyerId });
  await client.query(`UPDATE "practice_workspaces" SET "kind" = 'INDIVIDUAL' WHERE "id" = $1`, [individualId]);
  await expectRejected("individual workspace rejects a second active primary profile", async () => {
    await client.query(`UPDATE "lawyer_profiles" SET "is_primary" = TRUE WHERE "membership_id" = $1`, [extraLawyerId]);
  }, { constraint: "lawyer_profiles_one_primary_per_workspace_idx" });
  await client.query(`ROLLBACK TO SAVEPOINT ${primaryIndexSavepoint}`);
  await client.query(`RELEASE SAVEPOINT ${primaryIndexSavepoint}`);

  const foreignWorkspaceId = await insertWorkspace("FIRM", "foreign-firm");
  const foreignLawyerUser = await insertUser("foreign-lawyer");
  const foreignLawyerId = await insertMembership({
    workspaceId: foreignWorkspaceId,
    userId: foreignLawyerUser,
    role: "LAWYER",
  });
  await insertLawyerProfile({ workspaceId: foreignWorkspaceId, membershipId: foreignLawyerId });
  await expectRejected("supervisor FK rejects a lawyer from another workspace", async () => {
    const foreignAssistantUser = await insertUser("foreign-assistant");
    await insertMembership({
      workspaceId: firmId,
      userId: foreignAssistantUser,
      role: "ASSISTANT",
      status: "INVITED",
      supervisorId: foreignLawyerId,
    });
  }, { constraint: "practice_memberships_supervising_lawyer_membership_id_work_fkey" });

  const assistantInFirmUser = await insertUser("firm-assistant");
  const firmAssistantId = await insertMembership({
    workspaceId: firmId,
    userId: assistantInFirmUser,
    role: "ASSISTANT",
    supervisorId: firmLawyers[0],
  });
  await expectRejected("one assistant cannot have a second simultaneous membership assignment", async () => {
    await insertMembership({
      workspaceId: firmId,
      userId: assistantInFirmUser,
      role: "ASSISTANT",
      supervisorId: firmLawyers[1],
    });
  }, { constraint: "practice_memberships_workspace_id_user_id_key" });

  await expectRejected("supervising lawyer cannot be deactivated while active assistants depend on them", async () => {
    await client.query(
      `UPDATE "practice_memberships" SET "status" = 'SUSPENDED' WHERE "id" = $1`,
      [firmLawyers[0]],
    );
  }, { code: "P0001" });

  await client.query(
    `UPDATE "practice_memberships" SET "supervising_lawyer_membership_id" = $1 WHERE "id" = $2`,
    [firmLawyers[1], firmAssistantId],
  );
  let currentSupervisor = await client.query(
    `SELECT "supervising_lawyer_membership_id" FROM "practice_memberships" WHERE "id" = $1`,
    [firmAssistantId],
  );
  assert.equal(currentSupervisor.rows[0]?.supervising_lawyer_membership_id, firmLawyers[1]);
  reportPass("valid reassignment atomically replaces the assistant's sole current supervisor");

  const reassignmentSavepoint = `phase12_reassignment_${++savepointCount}`;
  await client.query(`SAVEPOINT ${reassignmentSavepoint}`);
  await client.query(
    `UPDATE "practice_memberships" SET "supervising_lawyer_membership_id" = $1 WHERE "id" = $2`,
    [firmLawyers[0], firmAssistantId],
  );
  await expectRejected("a later constraint failure aborts the reassignment unit", async () => {
    await insertMembership({
      workspaceId: firmId,
      userId: assistantInFirmUser,
      role: "ASSISTANT",
      supervisorId: firmLawyers[0],
    });
  }, { constraint: "practice_memberships_workspace_id_user_id_key" });
  await client.query(`ROLLBACK TO SAVEPOINT ${reassignmentSavepoint}`);
  await client.query(`RELEASE SAVEPOINT ${reassignmentSavepoint}`);
  currentSupervisor = await client.query(
    `SELECT "supervising_lawyer_membership_id" FROM "practice_memberships" WHERE "id" = $1`,
    [firmAssistantId],
  );
  assert.equal(currentSupervisor.rows[0]?.supervising_lawyer_membership_id, firmLawyers[1]);
  reportPass("rollback leaves no partial supervisor change after a later constraint failure");
}

async function main() {
  await client.connect();
  const database = await client.query("SELECT current_database() AS name");
  if (database.rows[0]?.name !== "jurismind_dev") {
    throw new Error("Safety stop: verification only runs against the explicitly approved jurismind_dev database");
  }
  reportPass("connected to the approved jurismind_dev database; no connection URL is displayed");
  await verifyCatalog();
  await runConstraintTests();
  await client.query("ROLLBACK");
  transactionOpen = false;

  const residue = await client.query(
    `SELECT count(*)::integer AS count FROM "users" WHERE "email_normalized" LIKE $1`,
    [`phase12-${runId}-%`],
  );
  assert.equal(residue.rows[0]?.count, 0, "Rollback left verification user data behind");
  reportPass("all generated verification data was removed by transaction rollback");
}

main()
  .catch((error) => {
    const code = error.sqlState ?? error.code;
    console.error(`FAIL ${error.testLabel ?? "database verification"}${code ? ` (${code})` : ""}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Closing the connection also rolls back any open PostgreSQL transaction.
      }
    }
    await client.end().catch(() => {});
  });
