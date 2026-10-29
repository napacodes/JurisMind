CREATE TYPE "LoginAudience" AS ENUM ('ADMINISTRATION', 'FIRM', 'LAWYER', 'ASSISTANT');

ALTER TABLE "user_sessions" ADD COLUMN "audience" "LoginAudience" NOT NULL DEFAULT 'FIRM';
ALTER TABLE "login_mfa_challenges" ADD COLUMN "audience" "LoginAudience" NOT NULL DEFAULT 'FIRM';

-- Existing sessions were issued without an entry-point identity. Revoke them
-- rather than guessing the intended role; users can sign in again safely.
UPDATE "user_sessions" SET "revoked_at" = CURRENT_TIMESTAMP WHERE "revoked_at" IS NULL;
UPDATE "login_mfa_challenges" SET "consumed_at" = CURRENT_TIMESTAMP WHERE "consumed_at" IS NULL;
