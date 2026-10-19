import { BadRequestException } from "@nestjs/common";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ContentInput = {
  type: "BLOG_POST" | "INFORMATIONAL_PAGE";
  slug: string;
  title: string;
  summary: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function parseContentId(value: string): string {
  if (!UUID.test(value)) throw new BadRequestException("Invalid content identifier.");
  return value;
}

export function parsePublicSlug(value: string): string {
  if (value.length > 120 || !SLUG.test(value)) throw new BadRequestException("Invalid content slug.");
  return value;
}

export function parseContentUpdate(raw: unknown): { input: ContentInput; expectedUpdatedAt: Date } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid content.");
  const value = raw as Record<string, unknown>;
  if (typeof value.expectedUpdatedAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.expectedUpdatedAt)) {
    throw new BadRequestException("Refresh this content before saving.");
  }
  const { expectedUpdatedAt, ...input } = value;
  const date = new Date(expectedUpdatedAt);
  if (!Number.isFinite(date.getTime())) throw new BadRequestException("Invalid content version.");
  return { input: parseContentInput(input), expectedUpdatedAt: date };
}

export function parseContentInput(raw: unknown): ContentInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid content.");
  const body = raw as Record<string, unknown>;
  const allowed = new Set(["type", "slug", "title", "summary", "body", "seoTitle", "seoDescription"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new BadRequestException("Invalid content.");
  if (body.type !== "BLOG_POST" && body.type !== "INFORMATIONAL_PAGE") throw new BadRequestException("Invalid content type.");
  const slugRaw = text(body.slug, 1, 160, "Invalid slug.").toLowerCase().replace(/\s+/g, "-");
  if (!SLUG.test(slugRaw) || slugRaw.length > 120) throw new BadRequestException("Slug must use lowercase letters, numbers, and single hyphens.");
  return {
    type: body.type,
    slug: slugRaw,
    title: text(body.title, 1, 180, "Invalid title."),
    summary: text(body.summary, 1, 500, "Invalid summary."),
    body: text(body.body, 1, 100_000, "Invalid body.", false),
    seoTitle: optionalText(body.seoTitle, 180),
    seoDescription: optionalText(body.seoDescription, 320),
  };
}

function optionalText(value: unknown, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return text(value, 1, max, "Invalid SEO metadata.");
}

function text(value: unknown, min: number, max: number, message: string, normalize = true): string {
  if (typeof value !== "string") throw new BadRequestException(message);
  const result = normalize ? value.trim().replace(/\s+/g, " ") : value.trim();
  if (result.length < min || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result)) {
    throw new BadRequestException(message);
  }
  return result;
}
