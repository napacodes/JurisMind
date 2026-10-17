-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "WorkspaceKind" AS ENUM ('FIRM', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('FIRM_ADMIN', 'LAWYER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "email_normalized" VARCHAR(320) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "password_hash" VARCHAR(255),
    "email_verified_at" TIMESTAMPTZ(6),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "kind" "WorkspaceKind" NOT NULL,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "practice_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_memberships" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "supervising_lawyer_membership_id" UUID,
    "joined_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "practice_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lawyer_profiles" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "display_title" VARCHAR(120),
    "jurisdiction" VARCHAR(120),
    "bar_number" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lawyer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "granted_by_id" UUID,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "platform_role_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_audit_events" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "workspace_id" UUID,
    "event_type" VARCHAR(120) NOT NULL,
    "target_type" VARCHAR(120),
    "target_id" VARCHAR(200),
    "request_id" VARCHAR(120),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "practice_workspaces_slug_key" ON "practice_workspaces"("slug");

-- CreateIndex
CREATE INDEX "practice_memberships_user_id_status_idx" ON "practice_memberships"("user_id", "status");

-- CreateIndex
CREATE INDEX "practice_memberships_workspace_id_role_status_idx" ON "practice_memberships"("workspace_id", "role", "status");

-- CreateIndex
CREATE INDEX "practice_memberships_supervising_lawyer_membership_id_works_idx" ON "practice_memberships"("supervising_lawyer_membership_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_memberships_workspace_id_user_id_key" ON "practice_memberships"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_memberships_id_workspace_id_key" ON "practice_memberships"("id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "lawyer_profiles_membership_id_key" ON "lawyer_profiles"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "lawyer_profiles_membership_id_workspace_id_key" ON "lawyer_profiles"("membership_id", "workspace_id");

-- CreateIndex
CREATE INDEX "platform_role_grants_user_id_role_revoked_at_idx" ON "platform_role_grants"("user_id", "role", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_expires_at_idx" ON "user_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "security_audit_events_workspace_id_created_at_idx" ON "security_audit_events"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "security_audit_events_actor_user_id_created_at_idx" ON "security_audit_events"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "security_audit_events_event_type_created_at_idx" ON "security_audit_events"("event_type", "created_at");

-- AddForeignKey
ALTER TABLE "practice_memberships" ADD CONSTRAINT "practice_memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "practice_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_memberships" ADD CONSTRAINT "practice_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_memberships" ADD CONSTRAINT "practice_memberships_supervising_lawyer_membership_id_work_fkey" FOREIGN KEY ("supervising_lawyer_membership_id", "workspace_id") REFERENCES "practice_memberships"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lawyer_profiles" ADD CONSTRAINT "lawyer_profiles_membership_id_workspace_id_fkey" FOREIGN KEY ("membership_id", "workspace_id") REFERENCES "practice_memberships"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_grants" ADD CONSTRAINT "platform_role_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_grants" ADD CONSTRAINT "platform_role_grants_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_audit_events" ADD CONSTRAINT "security_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_audit_events" ADD CONSTRAINT "security_audit_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "practice_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database invariants that Prisma's portable schema cannot express.
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_normalized_lowercase_check"
  CHECK ("email_normalized" = lower(btrim("email_normalized")));

ALTER TABLE "practice_memberships"
  ADD CONSTRAINT "practice_memberships_supervisor_role_check"
  CHECK (
    ("role" = 'ASSISTANT' AND ("status" <> 'ACTIVE' OR "supervising_lawyer_membership_id" IS NOT NULL))
    OR ("role" <> 'ASSISTANT' AND "supervising_lawyer_membership_id" IS NULL)
  );

ALTER TABLE "user_sessions"
  ADD CONSTRAINT "user_sessions_token_hash_hex_check"
  CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "user_sessions_expiry_check"
  CHECK ("expires_at" > "created_at");

CREATE UNIQUE INDEX "platform_role_grants_one_active_role_idx"
  ON "platform_role_grants" ("user_id", "role")
  WHERE "revoked_at" IS NULL;

CREATE FUNCTION "enforce_practice_membership_invariants"() RETURNS trigger AS $$
DECLARE
  workspace_kind "WorkspaceKind";
  supervisor_role "MembershipRole";
  supervisor_status "MembershipStatus";
BEGIN
  SELECT "kind" INTO workspace_kind
  FROM "practice_workspaces"
  WHERE "id" = NEW."workspace_id"
  FOR UPDATE;

  IF NEW."role" = 'FIRM_ADMIN' AND workspace_kind <> 'FIRM' THEN
    RAISE EXCEPTION 'FIRM_ADMIN memberships require a FIRM workspace';
  END IF;

  IF NEW."role" = 'ASSISTANT' AND NEW."status" = 'ACTIVE' THEN
    SELECT "role", "status" INTO supervisor_role, supervisor_status
    FROM "practice_memberships"
    WHERE "id" = NEW."supervising_lawyer_membership_id"
      AND "workspace_id" = NEW."workspace_id"
    FOR UPDATE;

    IF supervisor_role IS DISTINCT FROM 'LAWYER' OR supervisor_status IS DISTINCT FROM 'ACTIVE' THEN
      RAISE EXCEPTION 'An active assistant must have one active supervising lawyer in the same workspace';
    END IF;
  END IF;

  IF NEW."role" <> 'ASSISTANT' AND NEW."supervising_lawyer_membership_id" IS NOT NULL THEN
    RAISE EXCEPTION 'Only assistant memberships can have a supervising lawyer';
  END IF;

  IF NEW."role" <> 'LAWYER' AND EXISTS (
    SELECT 1 FROM "lawyer_profiles" WHERE "membership_id" = NEW."id"
  ) THEN
    RAISE EXCEPTION 'A membership with a lawyer profile must retain the LAWYER role';
  END IF;

  IF NEW."role" <> 'LAWYER' OR NEW."status" <> 'ACTIVE' THEN
    IF EXISTS (
      SELECT 1 FROM "practice_memberships" assistant
      WHERE assistant."supervising_lawyer_membership_id" = NEW."id"
        AND assistant."workspace_id" = NEW."workspace_id"
        AND assistant."status" = 'ACTIVE'
    ) THEN
      RAISE EXCEPTION 'Reassign or deactivate active assistants before changing this lawyer role or status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "practice_memberships_invariants_trigger"
  BEFORE INSERT OR UPDATE OF "workspace_id", "role", "status", "supervising_lawyer_membership_id"
  ON "practice_memberships"
  FOR EACH ROW EXECUTE FUNCTION "enforce_practice_membership_invariants"();

CREATE FUNCTION "enforce_lawyer_profile_role"() RETURNS trigger AS $$
DECLARE
  membership_role "MembershipRole";
BEGIN
  SELECT "role" INTO membership_role
  FROM "practice_memberships"
  WHERE "id" = NEW."membership_id"
    AND "workspace_id" = NEW."workspace_id"
  FOR UPDATE;

  IF membership_role IS DISTINCT FROM 'LAWYER' THEN
    RAISE EXCEPTION 'Lawyer profiles must belong to a LAWYER membership in the same workspace';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "lawyer_profiles_role_trigger"
  BEFORE INSERT OR UPDATE OF "membership_id", "workspace_id"
  ON "lawyer_profiles"
  FOR EACH ROW EXECUTE FUNCTION "enforce_lawyer_profile_role"();

CREATE FUNCTION "enforce_workspace_kind_memberships"() RETURNS trigger AS $$
BEGIN
  IF NEW."kind" <> OLD."kind" AND NEW."kind" <> 'FIRM' AND EXISTS (
    SELECT 1 FROM "practice_memberships"
    WHERE "workspace_id" = NEW."id" AND "role" = 'FIRM_ADMIN'
  ) THEN
    RAISE EXCEPTION 'A workspace with Firm Admin memberships cannot change from FIRM';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "practice_workspaces_kind_trigger"
  BEFORE UPDATE OF "kind" ON "practice_workspaces"
  FOR EACH ROW EXECUTE FUNCTION "enforce_workspace_kind_memberships"();

