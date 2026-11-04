ALTER TABLE "users"
  ADD COLUMN "username" VARCHAR(32),
  ADD COLUMN "country_code" CHAR(2),
  ADD COLUMN "phone_number" VARCHAR(16),
  ADD COLUMN "profile_photo_key" VARCHAR(100);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_profile_photo_key_key" ON "users"("profile_photo_key");

ALTER TABLE "users"
  ADD CONSTRAINT "users_username_format_check"
  CHECK ("username" IS NULL OR "username" ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$');
