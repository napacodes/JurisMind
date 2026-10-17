import { Injectable } from "@nestjs/common";
import { Permission, isPermission, permissionsForPlatformRole, permissionsForPracticeRole } from "./permissions";
import type { AuthorizationContext } from "./authorization.types";

@Injectable()
export class AuthorizationService {
  hasPermission(
    context: AuthorizationContext,
    requestedPermission: string,
    workspaceId?: string,
  ): boolean {
    if (!isPermission(requestedPermission)) return false;
    const permission = requestedPermission as Permission;

    if (permission === Permission.ReadOwnProfile) return workspaceId === undefined;

    if (permission === Permission.PlatformAdministration) {
      return workspaceId === undefined && context.platformRoles.some((role) =>
        permissionsForPlatformRole(role).includes(permission),
      );
    }

    if (!workspaceId) return false;
    const membership = context.memberships.find((entry) => entry.workspaceId === workspaceId);
    if (!membership) return false;
    return permissionsForPracticeRole(membership.role, membership.workspaceKind).includes(permission);
  }
}
