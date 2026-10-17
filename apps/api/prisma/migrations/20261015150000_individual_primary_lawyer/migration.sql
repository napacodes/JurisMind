-- Additive and transactional: if existing individual workspaces do not have
-- exactly one unambiguous active lawyer, stop for an explicit data decision.
BEGIN;

ALTER TABLE "lawyer_profiles"
  ADD COLUMN "is_primary" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX "lawyer_profiles_one_primary_per_workspace_idx"
  ON "lawyer_profiles" ("workspace_id")
  WHERE "is_primary" = TRUE;

-- Backfill only the unambiguous case: one active lawyer profile in the workspace.
WITH "eligible_primary" AS (
  SELECT profile."id", profile."workspace_id"
  FROM "lawyer_profiles" profile
  JOIN "practice_workspaces" workspace ON workspace."id" = profile."workspace_id"
  JOIN "practice_memberships" membership
    ON membership."id" = profile."membership_id"
    AND membership."workspace_id" = profile."workspace_id"
  WHERE workspace."kind" = 'INDIVIDUAL'
    AND membership."role" = 'LAWYER'
    AND membership."status" = 'ACTIVE'
    AND (
      SELECT count(*)
      FROM "lawyer_profiles" candidate
      JOIN "practice_memberships" candidate_membership
        ON candidate_membership."id" = candidate."membership_id"
        AND candidate_membership."workspace_id" = candidate."workspace_id"
      WHERE candidate."workspace_id" = profile."workspace_id"
        AND candidate_membership."role" = 'LAWYER'
        AND candidate_membership."status" = 'ACTIVE'
    ) = 1
)
UPDATE "lawyer_profiles" profile
SET "is_primary" = TRUE
FROM "eligible_primary" eligible
WHERE profile."id" = eligible."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "practice_workspaces" workspace
    WHERE workspace."kind" = 'INDIVIDUAL'
      AND (
        (SELECT count(*) FROM "practice_memberships" membership
          WHERE membership."workspace_id" = workspace."id"
            AND membership."role" = 'LAWYER' AND membership."status" = 'ACTIVE') <> 1
        OR
        (SELECT count(*) FROM "lawyer_profiles" profile
          WHERE profile."workspace_id" = workspace."id" AND profile."is_primary" = TRUE) <> 1
      )
  ) THEN
    RAISE EXCEPTION 'Each individual workspace must have exactly one active lawyer and one active primary profile before this migration can complete';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "enforce_practice_membership_invariants"() RETURNS trigger AS $$
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

  IF NEW."role" = 'LAWYER'
    AND NEW."status" = 'ACTIVE'
    AND workspace_kind = 'INDIVIDUAL'
    AND EXISTS (
      SELECT 1 FROM "practice_memberships" existing_lawyer
      WHERE existing_lawyer."workspace_id" = NEW."workspace_id"
        AND existing_lawyer."role" = 'LAWYER'
        AND existing_lawyer."status" = 'ACTIVE'
        AND existing_lawyer."id" <> NEW."id"
    ) THEN
    RAISE EXCEPTION 'An INDIVIDUAL workspace can have only one active LAWYER membership';
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
    SELECT 1 FROM "lawyer_profiles"
    WHERE "membership_id" = NEW."id"
  ) THEN
    RAISE EXCEPTION 'A membership with a lawyer profile must retain the LAWYER role';
  END IF;

  IF (NEW."role" <> 'LAWYER' OR NEW."status" <> 'ACTIVE') AND EXISTS (
    SELECT 1 FROM "lawyer_profiles"
    WHERE "membership_id" = NEW."id" AND "is_primary" = TRUE
  ) THEN
    RAISE EXCEPTION 'An individual workspace primary lawyer must remain an active LAWYER until replaced';
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

CREATE OR REPLACE FUNCTION "enforce_lawyer_profile_role"() RETURNS trigger AS $$
DECLARE
  membership_role "MembershipRole";
  membership_status "MembershipStatus";
  workspace_kind "WorkspaceKind";
BEGIN
  SELECT membership."role", membership."status", workspace."kind"
  INTO membership_role, membership_status, workspace_kind
  FROM "practice_memberships" membership
  JOIN "practice_workspaces" workspace ON workspace."id" = membership."workspace_id"
  WHERE membership."id" = NEW."membership_id"
    AND membership."workspace_id" = NEW."workspace_id"
  FOR UPDATE OF membership, workspace;

  IF membership_role IS DISTINCT FROM 'LAWYER' THEN
    RAISE EXCEPTION 'Lawyer profiles must belong to a LAWYER membership in the same workspace';
  END IF;

  IF NEW."is_primary" = TRUE AND (
    workspace_kind IS DISTINCT FROM 'INDIVIDUAL'
    OR membership_status IS DISTINCT FROM 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'A primary lawyer profile must be an active LAWYER in an INDIVIDUAL workspace';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "assert_individual_workspace_primary_lawyer"(target_workspace_id UUID) RETURNS void AS $$
DECLARE
  workspace_kind "WorkspaceKind";
  primary_count BIGINT;
  active_lawyer_count BIGINT;
BEGIN
  SELECT "kind" INTO workspace_kind
  FROM "practice_workspaces"
  WHERE "id" = target_workspace_id;

  IF workspace_kind IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO primary_count
  FROM "lawyer_profiles" profile
  JOIN "practice_memberships" membership
    ON membership."id" = profile."membership_id"
    AND membership."workspace_id" = profile."workspace_id"
  WHERE profile."workspace_id" = target_workspace_id
    AND profile."is_primary" = TRUE
    AND membership."role" = 'LAWYER'
    AND membership."status" = 'ACTIVE';

  SELECT count(*) INTO active_lawyer_count
  FROM "practice_memberships"
  WHERE "workspace_id" = target_workspace_id
    AND "role" = 'LAWYER'
    AND "status" = 'ACTIVE';

  IF workspace_kind = 'INDIVIDUAL' AND (primary_count <> 1 OR active_lawyer_count <> 1) THEN
    RAISE EXCEPTION 'An INDIVIDUAL workspace must have exactly one active LAWYER membership and primary profile';
  ELSIF workspace_kind = 'FIRM' AND primary_count <> 0 THEN
    RAISE EXCEPTION 'A FIRM workspace cannot have an individual primary lawyer profile';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "check_individual_workspace_primary_lawyer"() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'practice_workspaces' THEN
    PERFORM "assert_individual_workspace_primary_lawyer"(NEW."id");
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM "assert_individual_workspace_primary_lawyer"(NEW."workspace_id");
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM "assert_individual_workspace_primary_lawyer"(OLD."workspace_id");
  ELSE
    PERFORM "assert_individual_workspace_primary_lawyer"(OLD."workspace_id");
    IF NEW."workspace_id" IS DISTINCT FROM OLD."workspace_id" THEN
      PERFORM "assert_individual_workspace_primary_lawyer"(NEW."workspace_id");
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "practice_workspaces_primary_lawyer_constraint"
  AFTER INSERT OR UPDATE ON "practice_workspaces"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "check_individual_workspace_primary_lawyer"();

CREATE CONSTRAINT TRIGGER "lawyer_profiles_primary_lawyer_constraint"
  AFTER INSERT OR UPDATE OR DELETE ON "lawyer_profiles"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "check_individual_workspace_primary_lawyer"();

COMMIT;
