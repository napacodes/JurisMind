import { BadRequestException } from "@nestjs/common";
import { MembershipRole, PlatformRole, UserStatus, WorkspaceKind } from "../generated/prisma/enums";

const roles = [...Object.values(MembershipRole), ...Object.values(PlatformRole)] as const;
export type PlatformUserRoleFilter = (typeof roles)[number];

export interface PlatformUserListQuery {
  page: number;
  pageSize: number;
  search?: string;
  role?: PlatformUserRoleFilter;
  status?: UserStatus;
  workspaceKind?: WorkspaceKind;
}

export interface CreatePlatformAdminInput {
  fullName: string;
  email: string;
  password: string;
}

function scalar(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new BadRequestException(`Invalid ${label}.`);
  return value;
}

function positiveInteger(value: string | undefined, fallback: number, maximum: number, label: string): number {
  if (value === undefined || value === "") return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new BadRequestException(`Invalid ${label}.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) throw new BadRequestException(`Invalid ${label}.`);
  return parsed;
}

export function parsePlatformUserListQuery(raw: Record<string, unknown>): PlatformUserListQuery {
  const allowed = ["page", "pageSize", "search", "role", "status", "workspaceKind"];
  if (Object.keys(raw).some((key) => !allowed.includes(key))) throw new BadRequestException("Invalid user-list query.");

  const searchValue = scalar(raw.search, "search");
  const search = searchValue?.trim();
  if (search && (search.length > 100 || /[\u0000-\u001f]/.test(search))) throw new BadRequestException("Invalid search value.");

  const roleValue = scalar(raw.role, "role");
  if (roleValue !== undefined && !roles.includes(roleValue as PlatformUserRoleFilter)) {
    throw new BadRequestException("Invalid role filter.");
  }
  const statusValue = scalar(raw.status, "status");
  if (statusValue !== undefined && !Object.values(UserStatus).includes(statusValue as UserStatus)) {
    throw new BadRequestException("Invalid status filter.");
  }
  const workspaceKindValue = scalar(raw.workspaceKind, "workspace type");
  if (workspaceKindValue !== undefined && !Object.values(WorkspaceKind).includes(workspaceKindValue as WorkspaceKind)) {
    throw new BadRequestException("Invalid workspace type filter.");
  }

  return {
    page: positiveInteger(scalar(raw.page, "page"), 1, 10_000, "page"),
    pageSize: positiveInteger(scalar(raw.pageSize, "page size"), 25, 100, "page size"),
    ...(search ? { search } : {}),
    ...(roleValue ? { role: roleValue as PlatformUserRoleFilter } : {}),
    ...(statusValue ? { status: statusValue as UserStatus } : {}),
    ...(workspaceKindValue ? { workspaceKind: workspaceKindValue as WorkspaceKind } : {}),
  };
}

export function parsePlatformUserStatus(raw: unknown): UserStatus {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid request body.");
  const body = raw as Record<string, unknown>;
  if (Object.keys(body).length !== 1 || !Object.values(UserStatus).includes(body.status as UserStatus)) {
    throw new BadRequestException("Invalid account status.");
  }
  return body.status as UserStatus;
}

export function parseCreatePlatformAdminInput(raw: unknown): CreatePlatformAdminInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid request body.");
  const body = raw as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["fullName", "email", "password"].includes(key))) {
    throw new BadRequestException("Only full name, email, and password are accepted.");
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : undefined;
  if (!fullName || fullName.length < 2 || fullName.length > 200 || /[\u0000-\u001f]/.test(fullName)) {
    throw new BadRequestException("A valid full name is required.");
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException("A valid email address is required.");
  }

  const password = typeof body.password === "string" ? body.password : undefined;
  if (!password || password.length < 12 || password.length > 256 || Buffer.byteLength(password, "utf8") > 1024) {
    throw new BadRequestException("Use a password between 12 and 256 characters.");
  }

  return { fullName, email, password };
}

export function parsePlatformUserId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestException("A valid user identifier is required.");
  }
  return value;
}
