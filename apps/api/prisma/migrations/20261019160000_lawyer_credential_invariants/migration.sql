ALTER TABLE "lawyer_credential_submissions"
  ADD CONSTRAINT "lawyer_credential_submission_review_state_check"
  CHECK (
    ("status" = 'PENDING' AND "reviewed_by_id" IS NULL AND "reviewed_at" IS NULL AND "review_reason" IS NULL)
    OR ("status" = 'APPROVED' AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "review_reason" IS NULL)
    OR ("status" = 'REJECTED' AND "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
      AND "review_reason" IS NOT NULL AND length(btrim("review_reason")) > 0)
  );

ALTER TABLE "lawyer_credential_documents"
  ADD CONSTRAINT "lawyer_credential_documents_media_type_check"
  CHECK ("media_type" IN ('application/pdf', 'image/jpeg', 'image/png'));
