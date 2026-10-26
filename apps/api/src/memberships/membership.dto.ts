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

export function parseAddMembership(value: unknown): { userId?: string; email?: string; role: MembershipRole; supervisorMembershipId?: string } {
  const body = object(value);
  exactKeys(body, ["userId", "email", "role", "supervisorMembershipId"]);
  if (!Object.values(MembershipRole).includes(body.role as MembershipRole)) throw new BadRequestException("Invalid practice role.");
  const hasUserId = body.userId !== undefined;
  const hasEmail = body.email !== undefined;
  if (hasUserId === hasEmail) throw new BadRequestException("Supply exactly one eligible account identifier.");
  if (hasUserId && typeof body.userId !== "string") throw new BadRequestException("A valid account identifier is required.");
  if (hasEmail && typeof body.email !== "string") throw new BadRequestException("Enter a valid email address.");
  let email: string | undefined;
  if (hasEmail) {
    email = (body.email as string).trim().toLowerCase();
    if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException("Enter a valid email address.");
  }
  const supervisorMembershipId = body.supervisorMembershipId === undefined ? undefined : uuid(body.supervisorMembershipId);
  if (body.role !== MembershipRole.ASSISTANT && supervisorMembershipId) throw new BadRequestException("Only assistant invitations accept a supervisor.");
  return {
    ...(hasUserId ? { userId: uuid(body.userId) } : {}),
    ...(email ? { email } : {}),
    role: body.role as MembershipRole,
    ...(supervisorMembershipId ? { supervisorMembershipId } : {}),
  };
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

