import { MembershipRole, PlatformRole, WorkspaceKind } from "../generated/prisma/enums";

export const Permission = {
  ReadOwnProfile: "profile:read:self",
  ReadWorkspaceMetadata: "workspace:read:metadata",
  ManageWorkspaceSettings: "workspace:manage:settings",
  ReadWorkspaceMemberships: "workspace:read:memberships",
  ManageWorkspaceMemberships: "workspace:manage:memberships",
  ManageAssistantAssignments: "workspace:manage:assistant-assignments",
  AccessLawyerPrivateResources: "matter:access:lawyer-private",
  AccessAssistantAuthorizedResources: "matter:access:assistant-authorized",
  PlatformAdministration: "platform:admin",
  SubmitLawyerCredentialVerification: "lawyer-credential:submit:self",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const FIRM_ADMIN_PERMISSIONS: readonly Permission[] = [
  Permission.ReadWorkspaceMetadata,
  Permission.ManageWorkspaceSettings,
  Permission.ReadWorkspaceMemberships,
  Permission.ManageWorkspaceMemberships,
  Permission.ManageAssistantAssignments,
];

const LAWYER_PERMISSIONS: readonly Permission[] = [Permission.ReadWorkspaceMetadata, Permission.ManageAssistantAssignments, Permission.SubmitLawyerCredentialVerification];
const ASSISTANT_PERMISSIONS: readonly Permission[] = [Permission.ReadWorkspaceMetadata];

const PRACTICE_ROLE_PERMISSIONS: Record<MembershipRole, readonly Permission[]> = {
  [MembershipRole.FIRM_ADMIN]: FIRM_ADMIN_PERMISSIONS,
  [MembershipRole.LAWYER]: LAWYER_PERMISSIONS,
  [MembershipRole.ASSISTANT]: ASSISTANT_PERMISSIONS,
};

const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, readonly Permission[]> = {
  [PlatformRole.SUPER_ADMIN]: [Permission.PlatformAdministration],
};

/** Maps capabilities only. Workspace membership and workspace kind are checked separately. */
export function permissionsForPracticeRole(
  role: MembershipRole,
  workspaceKind: WorkspaceKind,
): readonly Permission[] {
  if (role === MembershipRole.FIRM_ADMIN && workspaceKind !== WorkspaceKind.FIRM) return [];
  return PRACTICE_ROLE_PERMISSIONS[role];
}

export function permissionsForPlatformRole(role: PlatformRole): readonly Permission[] {
  return PLATFORM_ROLE_PERMISSIONS[role];
}

export function isPermission(value: string): value is Permission {
  return Object.values(Permission).some((permission) => permission === value);
}
