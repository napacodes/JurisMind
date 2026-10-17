import type { MembershipRole, PlatformRole, WorkspaceKind } from "../generated/prisma/enums";
import type { SafeUserIdentity } from "../auth/auth.types";
import type { Request } from "express";

export interface WorkspaceRoleContext {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceKind: WorkspaceKind;
  role: MembershipRole;
}

/** Built exclusively from an authenticated session and current database records. */
export interface AuthorizationContext {
  user: SafeUserIdentity;
  platformRoles: readonly PlatformRole[];
  memberships: readonly WorkspaceRoleContext[];
}

export interface RequiredPermission {
  permission?: string;
  anyOf?: readonly string[];
  workspaceIdParam?: string;
}

export interface AuthorizationRequest extends Request {
  authorizationContext?: AuthorizationContext;
  /** Set only by SessionAuthGuard after verifying the server-side session. */
  authenticatedSessionId?: string;
}
