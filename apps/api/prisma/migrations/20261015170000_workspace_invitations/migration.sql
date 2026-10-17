CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

CREATE TABLE "workspace_invitations" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "membership_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "intended_email" VARCHAR(320) NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "created_by_id" UUID NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_invitations_email_normalized_check" CHECK ("intended_email" = lower(btrim("intended_email"))),
  CONSTRAINT "workspace_invitations_token_hash_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "workspace_invitations_expiry_check" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "workspace_invitations_state_check" CHECK (
    ("status" = 'PENDING' AND "accepted_at" IS NULL AND "revoked_at" IS NULL) OR
    ("status" = 'ACCEPTED' AND "accepted_at" IS NOT NULL AND "revoked_at" IS NULL) OR
    ("status" = 'REVOKED' AND "accepted_at" IS NULL AND "revoked_at" IS NOT NULL) OR
    ("status" = 'EXPIRED' AND "accepted_at" IS NULL AND "revoked_at" IS NULL)
  ),
  CONSTRAINT "workspace_invitations_membership_workspace_fkey" FOREIGN KEY ("membership_id", "workspace_id")
    REFERENCES "practice_memberships"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "workspace_invitations_workspace_fkey" FOREIGN KEY ("workspace_id")
    REFERENCES "practice_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "workspace_invitations_recipient_fkey" FOREIGN KEY ("recipient_user_id")
    REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "workspace_invitations_creator_fkey" FOREIGN KEY ("created_by_id")
    REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "workspace_invitations_token_hash_key" ON "workspace_invitations"("token_hash");
CREATE INDEX "workspace_invitations_membership_id_status_idx" ON "workspace_invitations"("membership_id", "status");
CREATE INDEX "workspace_invitations_workspace_id_status_expires_at_idx"
  ON "workspace_invitations"("workspace_id", "status", "expires_at");
CREATE INDEX "workspace_invitations_recipient_user_id_status_expires_at_idx"
  ON "workspace_invitations"("recipient_user_id", "status", "expires_at");
CREATE UNIQUE INDEX "workspace_invitations_one_pending_per_workspace_recipient"
  ON "workspace_invitations"("workspace_id", "recipient_user_id") WHERE "status" = 'PENDING';
