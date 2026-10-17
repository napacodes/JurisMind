import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthorizationContextService } from "../src/authorization/authorization-context.service";
import { AuthorizationService } from "../src/authorization/authorization.service";
import { Permission } from "../src/authorization/permissions";
import { PermissionsGuard } from "../src/authorization/permissions.guard";
import { RequireWorkspacePermission } from "../src/authorization/require-permission.decorator";
import type { PrismaService } from "../src/database/prisma.service";

const testDatabaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (testDatabaseUrl && new URL(testDatabaseUrl).pathname.slice(1) !== "jurismind_auth_test") {
  throw new Error("Safety stop: AUTH_TEST_DATABASE_URL must target jurismind_auth_test exactly.");
}

test("authorization context resolves only current PostgreSQL memberships and platform grants", {
  skip: !testDatabaseUrl ? "Set AUTH_TEST_DATABASE_URL to the dedicated jurismind_auth_test database." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl! }) });
  const contextService = new AuthorizationContextService(prisma as unknown as PrismaService);
  const authorization = new AuthorizationService();
  const firmAId = randomUUID();
  const firmBId = randomUUID();
  const firmASlug = `authz-a-${randomUUID()}`;
  const firmBSlug = `authz-b-${randomUUID()}`;
  const firmAdminId = randomUUID();
  const lawyerId = randomUUID();
  const assistantId = randomUUID();
  const noMembershipId = randomUUID();
  const platformAdminId = randomUUID();
  const firmAdminMembershipId = randomUUID();
  const lawyerMembershipId = randomUUID();
  const assistantMembershipId = randomUUID();
  const platformGrantId = randomUUID();
  const fixtureUsers = [
    { id: firmAdminId, email: `firm-admin-${randomUUID()}@example.invalid`, fullName: "Authz Firm Admin" },
    { id: lawyerId, email: `lawyer-${randomUUID()}@example.invalid`, fullName: "Authz Lawyer" },
    { id: assistantId, email: `assistant-${randomUUID()}@example.invalid`, fullName: "Authz Assistant" },
    { id: noMembershipId, email: `memberless-${randomUUID()}@example.invalid`, fullName: "Authz No Membership" },
    { id: platformAdminId, email: `platform-admin-${randomUUID()}@example.invalid`, fullName: "Authz Platform Admin" },
  ];
  let fixturesCreated = false;

  try {
    await prisma.$connect();
    const database = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    assert.equal(database[0]?.name, "jurismind_auth_test", "authorization tests must never use jurismind_dev");

    await prisma.$transaction(async (transaction) => {
      await transaction.practiceWorkspace.createMany({ data: [
        { id: firmAId, name: "Authz Firm A", slug: firmASlug, kind: "FIRM" },
        { id: firmBId, name: "Authz Firm B", slug: firmBSlug, kind: "FIRM" },
      ] });
      await transaction.user.createMany({
        data: fixtureUsers.map((user) => ({
          ...user,
          emailNormalized: user.email,
          status: "ACTIVE" as const,
        })),
      });
      await transaction.practiceMembership.createMany({ data: [
        {
          id: firmAdminMembershipId,
          workspaceId: firmAId,
          userId: firmAdminId,
          role: "FIRM_ADMIN",
          status: "ACTIVE",
          joinedAt: new Date(),
        },
        {
          id: lawyerMembershipId,
          workspaceId: firmAId,
          userId: lawyerId,
          role: "LAWYER",
          status: "ACTIVE",
          joinedAt: new Date(),
        },
        {
          id: assistantMembershipId,
          workspaceId: firmAId,
          userId: assistantId,
          role: "ASSISTANT",
          status: "ACTIVE",
          supervisingLawyerMembershipId: lawyerMembershipId,
          joinedAt: new Date(),
        },
      ] });
      await transaction.platformRoleGrant.create({
        data: { id: platformGrantId, userId: platformAdminId, role: "SUPER_ADMIN" },
      });
    });
    fixturesCreated = true;

    const adminContext = await contextService.resolveForUser(firmAdminId);
    assert.ok(adminContext);
    assert.equal(authorization.hasPermission(adminContext, Permission.ManageWorkspaceSettings, firmAId), true);
    assert.equal(authorization.hasPermission(adminContext, Permission.AccessLawyerPrivateResources, firmAId), false,
      "firm role must not imply access to another lawyer's private matters");

    const lawyerContext = await contextService.resolveForUser(lawyerId);
    assert.ok(lawyerContext);
    assert.equal(authorization.hasPermission(lawyerContext, Permission.ReadWorkspaceMetadata, firmAId), true);
    assert.equal(authorization.hasPermission(lawyerContext, Permission.ReadWorkspaceMetadata, firmBId), false,
      "a role in firm A must not authorize firm B");

    const assistantContext = await contextService.resolveForUser(assistantId);
    assert.ok(assistantContext);
    assert.equal(authorization.hasPermission(assistantContext, Permission.AccessAssistantAuthorizedResources, firmAId), false,
      "assistant matter access remains denied until explicit authorization records exist");

    const memberlessContext = await contextService.resolveForUser(noMembershipId);
    assert.ok(memberlessContext);
    assert.equal(memberlessContext.memberships.length, 0);
    assert.equal(authorization.hasPermission(memberlessContext, Permission.ReadWorkspaceMetadata, firmAId), false);

    const platformContext = await contextService.resolveForUser(platformAdminId);
    assert.ok(platformContext);
    assert.deepEqual(platformContext.platformRoles, ["SUPER_ADMIN"]);
    assert.equal(platformContext.memberships.length, 0);
    assert.equal(authorization.hasPermission(platformContext, Permission.PlatformAdministration), true);
    assert.equal(authorization.hasPermission(platformContext, Permission.ReadWorkspaceMetadata, firmAId), false,
      "platform role does not create workspace membership");
    assert.equal(authorization.hasPermission(platformContext, Permission.AccessLawyerPrivateResources, firmAId), false,
      "platform administration does not grant confidential matter access");

    class FirmSettingsEndpoint {
      update() {}
    }
    RequireWorkspacePermission(Permission.ManageWorkspaceSettings)(
      FirmSettingsEndpoint.prototype,
      "update",
      Object.getOwnPropertyDescriptor(FirmSettingsEndpoint.prototype, "update")!,
    );
    const requestId = randomUUID();
    const permissionGuard = new PermissionsGuard(
      new Reflector(),
      authorization,
      prisma as unknown as PrismaService,
    );
    const deniedRequest = {
      authorizationContext: lawyerContext,
      params: { workspaceId: firmAId },
      header: (name: string) => name === "x-request-id" ? requestId : undefined,
    };
    const deniedExecutionContext = {
      switchToHttp: () => ({ getRequest: () => deniedRequest }),
      getHandler: () => FirmSettingsEndpoint.prototype.update,
      getClass: () => FirmSettingsEndpoint,
    } as never;
    await assert.rejects(permissionGuard.canActivate(deniedExecutionContext), ForbiddenException);
    const denialEvent = await prisma.securityAuditEvent.findFirst({ where: { actorUserId: lawyerId, requestId } });
    assert.equal(denialEvent?.eventType, "AUTHZ_DENIED");
    assert.equal(denialEvent?.targetId, Permission.ManageWorkspaceSettings);
    assert.equal(denialEvent?.workspaceId, null, "audit event does not persist caller-selected workspace scope");

    await prisma.practiceMembership.update({
      where: { id: firmAdminMembershipId },
      data: { status: "SUSPENDED" },
    });
    const suspendedContext = await contextService.resolveForUser(firmAdminId);
    assert.ok(suspendedContext);
    assert.equal(suspendedContext.memberships.length, 0, "suspended membership is excluded from authorization context");
    assert.equal(authorization.hasPermission(suspendedContext, Permission.ManageWorkspaceSettings, firmAId), false);
  } finally {
    if (fixturesCreated) {
      await prisma.$transaction(async (transaction) => {
        await transaction.securityAuditEvent.deleteMany({
          where: { actorUserId: { in: fixtureUsers.map((user) => user.id) } },
        });
        await transaction.platformRoleGrant.deleteMany({ where: { id: platformGrantId } });
        await transaction.practiceMembership.deleteMany({ where: { id: assistantMembershipId } });
        await transaction.practiceMembership.deleteMany({ where: { id: { in: [firmAdminMembershipId, lawyerMembershipId] } } });
        await transaction.practiceWorkspace.deleteMany({ where: { id: { in: [firmAId, firmBId] } } });
        await transaction.user.deleteMany({ where: { id: { in: fixtureUsers.map((user) => user.id) } } });
      });
    }
    await prisma.$disconnect();
  }
});
