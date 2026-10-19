import { BadRequestException } from "@nestjs/common";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuid(value: string): string {
  if (!UUID.test(value)) throw new BadRequestException("Invalid identifier.");
  return value;
}

export type CredentialSubmissionInput = { cardHolderName: string; jurisdiction: string; cardIdentifier: string };

export function parseSubmissionInput(raw: unknown): CredentialSubmissionInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid submission.");
  const body = raw as Record<string, unknown>;
  const allowed = new Set(["cardHolderName", "jurisdiction", "cardIdentifier"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new BadRequestException("Invalid submission.");
  const cardHolderName = normalized(body.cardHolderName, 1, 200);
  const jurisdiction = normalized(body.jurisdiction, 1, 120);
  const cardIdentifier = typeof body.cardIdentifier === "string" ? body.cardIdentifier.trim() : "";
  if (!cardIdentifier || cardIdentifier.length > 120 || /[\r\n\u0000-\u001f]/.test(cardIdentifier)) {
    throw new BadRequestException("Invalid submission.");
  }
  return { cardHolderName, jurisdiction, cardIdentifier };
}

export function parseReviewInput(raw: unknown): { decision: "APPROVED" | "REJECTED"; reason: string | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid review decision.");
  const body = raw as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "decision" && key !== "reason")) throw new BadRequestException("Invalid review decision.");
  if (body.decision !== "APPROVED" && body.decision !== "REJECTED") throw new BadRequestException("Invalid review decision.");
  const reason = body.reason === undefined ? "" : typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length > 1000 || (body.decision === "REJECTED" && !reason)) throw new BadRequestException("A rejection reason is required.");
  return { decision: body.decision, reason: body.decision === "REJECTED" ? reason : null };
}

function normalized(value: unknown, min: number, max: number): string {
  if (typeof value !== "string") throw new BadRequestException("Invalid submission.");
  const result = value.trim().replace(/\s+/g, " ");
  if (result.length < min || result.length > max || /[\u0000-\u001f]/.test(result)) throw new BadRequestException("Invalid submission.");
  return result;
}
