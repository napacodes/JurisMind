ALTER TABLE "lawyer_credential_submissions"
  ADD COLUMN "professional_regulator" VARCHAR(160) NOT NULL DEFAULT 'Legacy record';

ALTER TABLE "lawyer_credential_submissions"
  DROP CONSTRAINT "lawyer_credential_submission_review_state_check";
ALTER TABLE "lawyer_credential_submissions"
  ADD CONSTRAINT "lawyer_credential_submission_review_state_check"
  CHECK (
    ("status" = 'PENDING' AND "reviewed_by_id" IS NULL AND "reviewed_at" IS NULL AND "review_reason" IS NULL)
    OR ("status" = 'APPROVED' AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "review_reason" IS NULL)
    OR ("status" IN ('REJECTED', 'CHANGES_REQUESTED') AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
      AND "review_reason" IS NOT NULL AND length(btrim("review_reason")) > 0)
  );

CREATE TYPE "FirmVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');
CREATE TYPE "FirmVerificationDocumentType" AS ENUM ('REGISTRATION', 'AUTHORITY');

CREATE TABLE "firm_verification_submissions" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "submitted_by_id" UUID NOT NULL,
  "details_ciphertext" TEXT NOT NULL,
  "status" "FirmVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "review_reason" VARCHAR(1000),
  "reviewed_by_id" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "firm_verification_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "firm_verification_submissions_review_state_check" CHECK (
    ("status" = 'PENDING' AND "reviewed_by_id" IS NULL AND "reviewed_at" IS NULL AND "review_reason" IS NULL)
    OR ("status" = 'APPROVED' AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "review_reason" IS NULL)
    OR ("status" IN ('REJECTED', 'CHANGES_REQUESTED') AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
      AND "review_reason" IS NOT NULL AND length(btrim("review_reason")) > 0)
  ),
  CONSTRAINT "firm_verification_submissions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "practice_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "firm_verification_submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "firm_verification_submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "firm_verification_documents" (
  "id" UUID NOT NULL,
  "submission_id" UUID NOT NULL,
  "document_type" "FirmVerificationDocumentType" NOT NULL,
  "storage_key" VARCHAR(100) NOT NULL,
  "media_type" VARCHAR(80) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "firm_verification_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "firm_verification_documents_media_type_check" CHECK ("media_type" IN ('application/pdf', 'image/jpeg', 'image/png')),
  CONSTRAINT "firm_verification_documents_size_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 10485760),
  CONSTRAINT "firm_verification_documents_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "firm_verification_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "firm_verification_documents_storage_key_key" ON "firm_verification_documents"("storage_key");
CREATE INDEX "firm_verification_submissions_workspace_id_status_created_at_idx" ON "firm_verification_submissions"("workspace_id", "status", "created_at");
CREATE INDEX "firm_verification_submissions_submitted_by_id_created_at_idx" ON "firm_verification_submissions"("submitted_by_id", "created_at");
CREATE INDEX "firm_verification_documents_submission_id_idx" ON "firm_verification_documents"("submission_id");
CREATE UNIQUE INDEX "firm_verification_one_pending_per_workspace_idx" ON "firm_verification_submissions"("workspace_id") WHERE "status" = 'PENDING';
