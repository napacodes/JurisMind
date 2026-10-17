import { BadRequestException } from "@nestjs/common";

export function parseIndividualPractice(value: unknown): { name: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("Invalid request body.");
  }
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "name") || typeof body.name !== "string") {
    throw new BadRequestException("Only a workspace name is accepted.");
  }
  const name = body.name.trim();
  if (name.length < 1 || name.length > 200 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new BadRequestException("Workspace name must contain between 1 and 200 valid characters.");
  }
  return { name };
}

export function parseIdempotencyKey(value: string | undefined): string {
  if (!value || value.length > 120 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new BadRequestException("A valid Idempotency-Key header is required.");
  }
  return value;
}
