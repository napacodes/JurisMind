CREATE TYPE "ContentEntryType" AS ENUM ('BLOG_POST', 'INFORMATIONAL_PAGE');
CREATE TYPE "ContentEntryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "content_entries" (
  "id" UUID NOT NULL,
  "type" "ContentEntryType" NOT NULL,
  "status" "ContentEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "slug" VARCHAR(120) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "body" TEXT NOT NULL,
  "seo_title" VARCHAR(180),
  "seo_description" VARCHAR(320),
  "created_by_id" UUID NOT NULL,
  "updated_by_id" UUID NOT NULL,
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "content_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "content_entries_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "content_entries_publication_state_check" CHECK (("status" = 'PUBLISHED' AND "published_at" IS NOT NULL) OR ("status" <> 'PUBLISHED' AND "published_at" IS NULL)),
  CONSTRAINT "content_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "content_entries_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "content_entries_slug_key" ON "content_entries"("slug");
CREATE INDEX "content_entries_status_type_published_at_idx" ON "content_entries"("status", "type", "published_at");
CREATE INDEX "content_entries_updated_at_idx" ON "content_entries"("updated_at");
