ALTER TABLE "lawyer_credential_submissions" ADD COLUMN "expires_at" TIMESTAMPTZ(6);
ALTER TABLE "firm_verification_submissions" ADD COLUMN "expires_at" TIMESTAMPTZ(6);

ALTER TABLE "lawyer_credential_submissions"
  DROP CONSTRAINT "lawyer_credential_submission_review_state_check";
ALTER TABLE "lawyer_credential_submissions"
  ADD CONSTRAINT "lawyer_credential_submission_review_state_check" CHECK (
    ("status" = 'DRAFT' AND "reviewed_by_id" IS NULL AND "reviewed_at" IS NULL AND "review_reason" IS NULL AND "expires_at" IS NULL)
    OR ("status" = 'PENDING' AND "reviewed_by_id" IS NULL AND "reviewed_at" IS NULL AND "review_reason" IS NULL AND "expires_at" IS NULL)
    OR ("status" = 'APPROVED' AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "review_reason" IS NULL)
    OR ("status" = 'EXPIRED' AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "review_reason" IS NULL
      AND "expires_at" IS NOT NULL)
    OR ("status" IN ('REJECTED', 'CHANGES_REQUESTED') AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
      AND "review_reason" IS NOT NULL AND length(btrim("review_reason")) > 0 AND "expires_at" IS NULL)
  );

ALTER TABLE "firm_verification_submissions"
  DROP CONSTRAINT "firm_verification_submissions_review_state_check";
ALTER TABLE "firm_verification_submissions"
  ADD CONSTRAINT "firm_verification_submissions_review_state_check" CHECK (
    ("status" = 'DRAFT' AND "reviewed_by_id" IS NULL AND "reviewed_at" IS NULL AND "review_reason" IS NULL AND "expires_at" IS NULL)
    OR ("status" = 'PENDING' AND "reviewed_by_id" IS NULL AND "reviewed_at" IS NULL AND "review_reason" IS NULL AND "expires_at" IS NULL)
    OR ("status" = 'APPROVED' AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "review_reason" IS NULL)
    OR ("status" = 'EXPIRED' AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "review_reason" IS NULL
      AND "expires_at" IS NOT NULL)
    OR ("status" IN ('REJECTED', 'CHANGES_REQUESTED') AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
      AND "review_reason" IS NOT NULL AND length(btrim("review_reason")) > 0 AND "expires_at" IS NULL)
  );

CREATE UNIQUE INDEX "lawyer_credential_one_draft_per_membership_idx"
  ON "lawyer_credential_submissions"("membership_id") WHERE "status" = 'DRAFT';
CREATE UNIQUE INDEX "firm_verification_one_draft_per_workspace_idx"
  ON "firm_verification_submissions"("workspace_id") WHERE "status" = 'DRAFT';
CREATE INDEX "lawyer_credential_submissions_expires_at_idx"
  ON "lawyer_credential_submissions"("expires_at") WHERE "status" = 'APPROVED';
CREATE INDEX "firm_verification_submissions_expires_at_idx"
  ON "firm_verification_submissions"("expires_at") WHERE "status" = 'APPROVED';
