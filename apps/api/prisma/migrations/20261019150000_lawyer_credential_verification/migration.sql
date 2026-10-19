CREATE TYPE "LawyerCredentialSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "lawyer_credential_submissions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "card_holder_name" VARCHAR(200) NOT NULL,
    "jurisdiction" VARCHAR(120) NOT NULL,
    "card_identifier_ciphertext" TEXT NOT NULL,
    "card_identifier_last4" CHAR(4) NOT NULL,
    "status" "LawyerCredentialSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "review_reason" VARCHAR(1000),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lawyer_credential_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lawyer_credential_submissions_id_workspace_membership_key" UNIQUE ("id", "workspace_id", "membership_id"),
    CONSTRAINT "lawyer_credential_submissions_membership_id_workspace_id_fkey"
      FOREIGN KEY ("membership_id", "workspace_id") REFERENCES "practice_memberships"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lawyer_credential_submissions_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "lawyer_credential_documents" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "storage_key" VARCHAR(100) NOT NULL,
    "media_type" VARCHAR(80) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lawyer_credential_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lawyer_credential_documents_submission_id_workspace_membership_fkey"
      FOREIGN KEY ("submission_id", "workspace_id", "membership_id") REFERENCES "lawyer_credential_submissions"("id", "workspace_id", "membership_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lawyer_credential_documents_size_bytes_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 10485760)
);

CREATE UNIQUE INDEX "lawyer_credential_documents_storage_key_key" ON "lawyer_credential_documents"("storage_key");
CREATE INDEX "lawyer_credential_submissions_workspace_id_status_created_at_idx" ON "lawyer_credential_submissions"("workspace_id", "status", "created_at");
CREATE INDEX "lawyer_credential_submissions_membership_id_created_at_idx" ON "lawyer_credential_submissions"("membership_id", "created_at");
CREATE INDEX "lawyer_credential_documents_submission_id_idx" ON "lawyer_credential_documents"("submission_id");
CREATE UNIQUE INDEX "lawyer_credential_one_pending_per_membership_idx" ON "lawyer_credential_submissions"("membership_id") WHERE "status" = 'PENDING';
