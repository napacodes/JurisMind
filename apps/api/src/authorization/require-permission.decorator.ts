import { SetMetadata } from "@nestjs/common";
import type { Permission } from "./permissions";
import type { RequiredPermission } from "./authorization.types";

export const REQUIRED_PERMISSION_METADATA = "jurismind:required-permission";

export function RequirePermission(permission: Permission): MethodDecorator & ClassDecorator {
  return SetMetadata(REQUIRED_PERMISSION_METADATA, { permission } satisfies RequiredPermission);
}

export function RequireWorkspacePermission(
  permission: Permission,
  workspaceIdParam = "workspaceId",
): MethodDecorator & ClassDecorator {
  return SetMetadata(REQUIRED_PERMISSION_METADATA, {
    permission,
    workspaceIdParam,
  } satisfies RequiredPermission);
}

export function RequireWorkspacePermissionAnyOf(
  permissions: readonly Permission[],
  workspaceIdParam = "workspaceId",
): MethodDecorator & ClassDecorator {
  return SetMetadata(REQUIRED_PERMISSION_METADATA, {
    permission: permissions[0],
    anyOf: permissions,
    workspaceIdParam,
  } satisfies RequiredPermission);
}
