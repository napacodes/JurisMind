import assert from "node:assert/strict";
import { test } from "node:test";
import { MembershipRole, PlatformRole, WorkspaceKind } from "../src/generated/prisma/enums";
import { AuthorizationService } from "../src/authorization/authorization.service";
import { PermissionsGuard } from "../src/authorization/permissions.guard";
import { RequirePermission, RequireWorkspacePermission, REQUIRED_PERMISSION_METADATA } from "../src/authorization/require-permission.decorator";
import { Permission, permissionsForPracticeRole, permissionsForPlatformRole } from "../src/authorization/permissions";
import type { AuthorizationContext } from "../src/authorization/authorization.types";
import { Reflector } from "@nestjs/core";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

const service = new AuthorizationService();
const workspaceA = "workspace-a";
const workspaceB = "workspace-b";

function context(
  role?: MembershipRole,
  workspaceKind: WorkspaceKind = WorkspaceKind.FIRM,
  platformRoles: PlatformRole[] = [],
): AuthorizationContext {
  return {
    user: { id: "user-1", email: "user@example.invalid", fullName: "Test User" },
    platformRoles,
    memberships: role ? [{
      workspaceId: workspaceA,
      workspaceName: "Firm A",
      workspaceSlug: "firm-a",
      workspaceKind,
      role,
    }] : [],
  };
}

test("practice permission catalogue is explicit for every role and workspace kind", () => {
  const firmAdmin = permissionsForPracticeRole(MembershipRole.FIRM_ADMIN, WorkspaceKind.FIRM);
  assert.deepEqual(firmAdmin, [
    Permission.ReadWorkspaceMetadata,
    Permission.ManageWorkspaceSettings,
    Permission.ReadWorkspaceMemberships,
    Permission.ManageWorkspaceMemberships,
    Permission.ManageAssistantAssignments,
    Permission.SubmitFirmVerification,
  ]);
  assert.deepEqual(permissionsForPracticeRole(MembershipRole.FIRM_ADMIN, WorkspaceKind.INDIVIDUAL), []);
  assert.deepEqual(permissionsForPracticeRole(MembershipRole.LAWYER, WorkspaceKind.FIRM), [Permission.ReadWorkspaceMetadata, Permission.ManageAssistantAssignments, Permission.SubmitLawyerCredentialVerification]);
  assert.deepEqual(permissionsForPracticeRole(MembershipRole.LAWYER, WorkspaceKind.INDIVIDUAL), [Permission.ReadWorkspaceMetadata, Permission.ManageAssistantAssignments, Permission.SubmitLawyerCredentialVerification]);
  assert.deepEqual(permissionsForPracticeRole(MembershipRole.ASSISTANT, WorkspaceKind.FIRM), [Permission.ReadWorkspaceMetadata]);
  assert.deepEqual(permissionsForPracticeRole(MembershipRole.ASSISTANT, WorkspaceKind.INDIVIDUAL), [Permission.ReadWorkspaceMetadata]);
  assert.equal(service.hasPermission(context(MembershipRole.FIRM_ADMIN), Permission.SubmitLawyerCredentialVerification, workspaceA), false);
  assert.equal(service.hasPermission(context(MembershipRole.ASSISTANT), Permission.SubmitLawyerCredentialVerification, workspaceA), false);
  assert.equal(service.hasPermission(context(undefined, WorkspaceKind.FIRM, [PlatformRole.SUPER_ADMIN]), Permission.SubmitLawyerCredentialVerification, workspaceA), false);
  assert.equal(service.hasPermission(context(MembershipRole.FIRM_ADMIN), Permission.AccessLawyerPrivateResources, workspaceA), false);
  assert.equal(service.hasPermission(context(MembershipRole.FIRM_ADMIN), Permission.AccessAssistantAuthorizedResources, workspaceA), false);
});

test("SUPER_ADMIN resolves platform administration independently from practice roles", () => {
  assert.deepEqual(permissionsForPlatformRole(PlatformRole.SUPER_ADMIN), [Permission.PlatformAdministration]);
  const platformAdmin = context(undefined, WorkspaceKind.FIRM, [PlatformRole.SUPER_ADMIN]);
  assert.equal(service.hasPermission(platformAdmin, Permission.PlatformAdministration), true);
  assert.equal(service.hasPermission(platformAdmin, Permission.ReadWorkspaceMetadata, workspaceA), false);
  assert.equal(service.hasPermission(platformAdmin, Permission.AccessLawyerPrivateResources, workspaceA), false);
});

test("workspace permissions require an active membership in that exact workspace", () => {
  const lawyer = context(MembershipRole.LAWYER);
  assert.equal(service.hasPermission(lawyer, Permission.ReadWorkspaceMetadata, workspaceA), true);
  assert.equal(service.hasPermission(lawyer, Permission.ReadWorkspaceMetadata, workspaceB), false);
  assert.equal(service.hasPermission(context(), Permission.ReadWorkspaceMetadata, workspaceA), false);
  assert.equal(service.hasPermission(lawyer, Permission.ManageWorkspaceSettings, workspaceA), false);
});

test("private matter permissions remain denied for all current roles", () => {
  for (const role of Object.values(MembershipRole)) {
    const firmRole = context(role, WorkspaceKind.FIRM);
    assert.equal(service.hasPermission(firmRole, Permission.AccessLawyerPrivateResources, workspaceA), false);
    assert.equal(service.hasPermission(firmRole, Permission.AccessAssistantAuthorizedResources, workspaceA), false);
  }
  const individualLawyer = context(MembershipRole.LAWYER, WorkspaceKind.INDIVIDUAL);
  assert.equal(service.hasPermission(individualLawyer, Permission.ManageWorkspaceSettings, workspaceA), false);
});

test("unknown permissions and missing scope are denied", () => {
  const admin = context(MembershipRole.FIRM_ADMIN);
  assert.equal(service.hasPermission(admin, "permission:unknown", workspaceA), false);
  assert.equal(service.hasPermission(admin, Permission.ManageWorkspaceSettings), false);
});

test("permission guard is deny-by-default and does not trust request role or tenant fields", async () => {
  class Endpoint {
    workspace() {}
    unconfigured() {}
  }
  RequireWorkspacePermission(Permission.ManageWorkspaceSettings)(
    Endpoint.prototype,
    "workspace",
    Object.getOwnPropertyDescriptor(Endpoint.prototype, "workspace")!,
  );
  const reflector = new Reflector();
  const denialEvents: Array<Record<string, unknown>> = [];
  const prisma = {
    securityAuditEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => denialEvents.push(data),
    },
  };
  const guard = new PermissionsGuard(reflector, service, prisma as never);
  const handler = Endpoint.prototype.workspace;
  const makeExecutionContext = (request: Record<string, unknown>) => ({
    switchToHttp: () => ({ getRequest: () => ({ header: () => undefined, ...request }) }),
    getHandler: () => handler,
    getClass: () => Endpoint,
  }) as never;

  const allowed = {
    params: { workspaceId: workspaceA },
    body: { role: "SUPER_ADMIN", workspaceId: workspaceB },
    query: { role: "SUPER_ADMIN", workspaceId: workspaceB },
    authorizationContext: context(MembershipRole.FIRM_ADMIN),
  };
  assert.equal(await guard.canActivate(makeExecutionContext(allowed)), true);

  const forgedRole = {
    params: { workspaceId: workspaceA },
    body: { role: "FIRM_ADMIN", userId: "attacker", workspaceId: workspaceA },
    authorizationContext: context(MembershipRole.ASSISTANT),
  };
  await assert.rejects(guard.canActivate(makeExecutionContext(forgedRole)), ForbiddenException);

  const forgedTenant = {
    params: { workspaceId: workspaceB },
    body: { role: "FIRM_ADMIN", workspaceId: workspaceA },
    authorizationContext: context(MembershipRole.FIRM_ADMIN),
  };
  await assert.rejects(guard.canActivate(makeExecutionContext(forgedTenant)), ForbiddenException);
  assert.equal(denialEvents.length, 2);
  assert.equal(denialEvents[0]?.eventType, "AUTHZ_DENIED");
  assert.equal("workspaceId" in denialEvents[0]!, false, "denial audit does not trust or store requested tenant scope");

  const noContext = { params: { workspaceId: workspaceA } };
  await assert.rejects(guard.canActivate(makeExecutionContext(noContext)), UnauthorizedException);

  const noPolicyGuard = new PermissionsGuard(reflector, service, prisma as never);
  const noPolicyExecution = {
    switchToHttp: () => ({ getRequest: () => ({ authorizationContext: context(MembershipRole.FIRM_ADMIN) }) }),
    getHandler: () => Endpoint.prototype.unconfigured,
    getClass: () => Endpoint,
  } as never;
  await assert.rejects(noPolicyGuard.canActivate(noPolicyExecution), ForbiddenException);
  assert.ok(Reflect.getMetadata(REQUIRED_PERMISSION_METADATA, handler));
});

test("authenticated-profile permission is independent of practice membership", () => {
  assert.equal(service.hasPermission(context(), Permission.ReadOwnProfile), true);
  assert.equal(service.hasPermission(context(), Permission.ReadOwnProfile, workspaceA), false);
});
