import { BadRequestException } from "@nestjs/common";
import { MembershipRole } from "../generated/prisma/enums";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("Invalid request body.");
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) throw new BadRequestException("Invalid request body.");
}

function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new BadRequestException("A valid identifier is required.");
  return value;
}

export function parseIdentifier(value: string): string {
  return uuid(value);
}

export function parseAddMembership(value: unknown): { userId: string; role: MembershipRole } {
  const body = object(value);
  exactKeys(body, ["userId", "role"]);
  if (!Object.values(MembershipRole).includes(body.role as MembershipRole)) throw new BadRequestException("Invalid practice role.");
  return { userId: uuid(body.userId), role: body.role as MembershipRole };
}

export function parseInvitationAcceptance(value: unknown): string {
  const body = object(value);
  exactKeys(body, ["token"]);
  if (typeof body.token !== "string" || body.token.length > 64) throw new BadRequestException("Invalid request body.");
  return body.token;
}

export function parseMembershipRole(value: unknown): MembershipRole {
  const body = object(value);
  exactKeys(body, ["role"]);
  if (!Object.values(MembershipRole).includes(body.role as MembershipRole)) throw new BadRequestException("Invalid practice role.");
  return body.role as MembershipRole;
}

export function parseSupervisor(value: unknown): string {
  const body = object(value);
  exactKeys(body, ["supervisorMembershipId"]);
  return uuid(body.supervisorMembershipId);
}

