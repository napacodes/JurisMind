CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "password_reset_tokens_hash_check" CHECK ("token_hash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "password_reset_tokens_expiry_check" CHECK ("expires_at" > "created_at")
);

CREATE TABLE "user_mfa" (
    "user_id" UUID NOT NULL,
    "secret_ciphertext" TEXT,
    "pending_secret_ciphertext" TEXT,
    "pending_expires_at" TIMESTAMPTZ(6),
    "enabled_at" TIMESTAMPTZ(6),
    "last_totp_counter" INTEGER NOT NULL DEFAULT -1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_mfa_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_mfa_pending_pair_check" CHECK (("pending_secret_ciphertext" IS NULL) = ("pending_expires_at" IS NULL)),
    CONSTRAINT "user_mfa_active_pair_check" CHECK (("secret_ciphertext" IS NOT NULL) = ("enabled_at" IS NOT NULL)),
    CONSTRAINT "user_mfa_counter_check" CHECK ("last_totp_counter" >= -1)
);

CREATE TABLE "mfa_recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMPTZ(6),
    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mfa_recovery_codes_hash_check" CHECK ("code_hash" ~ '^[a-f0-9]{64}$')
);

CREATE TABLE "login_mfa_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMPTZ(6),
    CONSTRAINT "login_mfa_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "login_mfa_challenges_hash_check" CHECK ("token_hash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "login_mfa_challenges_expiry_check" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "login_mfa_challenges_attempts_check" CHECK ("attempts" BETWEEN 0 AND 5)
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE UNIQUE INDEX "password_reset_tokens_one_unused_per_user_key" ON "password_reset_tokens"("user_id") WHERE "used_at" IS NULL;
CREATE INDEX "password_reset_tokens_user_id_created_at_idx" ON "password_reset_tokens"("user_id", "created_at");
CREATE UNIQUE INDEX "mfa_recovery_codes_user_id_code_hash_key" ON "mfa_recovery_codes"("user_id", "code_hash");
CREATE INDEX "mfa_recovery_codes_user_id_used_at_idx" ON "mfa_recovery_codes"("user_id", "used_at");
CREATE UNIQUE INDEX "login_mfa_challenges_token_hash_key" ON "login_mfa_challenges"("token_hash");
CREATE INDEX "login_mfa_challenges_user_id_expires_at_idx" ON "login_mfa_challenges"("user_id", "expires_at");

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_mfa"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "login_mfa_challenges" ADD CONSTRAINT "login_mfa_challenges_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_mfa"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
