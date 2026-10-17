import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { test } from "node:test";
import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AuthorizationContextService } from "../src/authorization/authorization-context.service";
import { AuthorizationService } from "../src/authorization/authorization.service";
import { MembershipsService } from "../src/memberships/memberships.service";
import type { PrismaService } from "../src/database/prisma.service";

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (databaseUrl && new URL(databaseUrl).pathname.slice(1) !== "jurismind_auth_test") {
  throw new Error("Safety stop: membership integration tests require jurismind_auth_test.");
}

test("membership and assistant workflows enforce workspace scope, audit atomically, and serialize reassignment", {
  skip: !databaseUrl ? "Set AUTH_TEST_DATABASE_URL to the dedicated jurismind_auth_test database." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const workspaceId = randomUUID();
  const slug = `phase4-${randomUUID()}`;
  const otherWorkspaceId = randomUUID();
  const otherSlug = `phase4-other-${randomUUID()}`;
  const individualWorkspaceId = randomUUID();
  const individualSlug = `phase4-individual-${randomUUID()}`;
  const adminId = randomUUID();
  const lawyerAId = randomUUID();
  const lawyerBId = randomUUID();
  const assistantId = randomUUID();
  const pendingId = randomUUID();
  const concurrentId = randomUUID();
  const invitedAssistantId = randomUUID();
  const otherLawyerId = randomUUID();
  const individualLawyerId = randomUUID();
  const individualAssistantId = randomUUID();
  const adminMembershipId = randomUUID();
  const pendingMembershipId = randomUUID();
  const lawyerAMembershipId = randomUUID();
  const lawyerBMembershipId = randomUUID();
  const assistantMembershipId = randomUUID();
  const concurrentMembershipId = randomUUID();
  const invitedAssistantMembershipId = randomUUID();
  const otherLawyerMembershipId = randomUUID();
  const individualLawyerMembershipId = randomUUID();
  const individualAssistantMembershipId = randomUUID();
  const revokedSessionId = randomUUID();
  const racingSessionId = randomUUID();
  const sessionIds: Record<string, string> = {
    [adminId]: randomUUID(),
    [lawyerAId]: randomUUID(),
    [lawyerBId]: randomUUID(),
    [individualLawyerId]: randomUUID(),
  };
  const userRows = [
    { id: adminId, email: `p4-admin-${randomUUID()}@example.invalid`, fullName: "Phase 4 Admin" },
    { id: lawyerAId, email: `p4-lawyer-a-${randomUUID()}@example.invalid`, fullName: "Phase 4 Lawyer A" },
    { id: lawyerBId, email: `p4-lawyer-b-${randomUUID()}@example.invalid`, fullName: "Phase 4 Lawyer B" },
    { id: assistantId, email: `p4-assistant-${randomUUID()}@example.invalid`, fullName: "Phase 4 Assistant" },
    { id: pendingId, email: `p4-pending-${randomUUID()}@example.invalid`, fullName: "Phase 4 Pending" },
    { id: concurrentId, email: `p4-concurrent-${randomUUID()}@example.invalid`, fullName: "Phase 4 Concurrent Assistant" },
    { id: invitedAssistantId, email: `p4-invited-assistant-${randomUUID()}@example.invalid`, fullName: "Phase 4 Invited Assistant" },
    { id: otherLawyerId, email: `p4-other-lawyer-${randomUUID()}@example.invalid`, fullName: "Phase 4 Other Workspace Lawyer" },
    { id: individualLawyerId, email: `p4-individual-lawyer-${randomUUID()}@example.invalid`, fullName: "Phase 4 Independent Lawyer" },
    { id: individualAssistantId, email: `p4-individual-assistant-${randomUUID()}@example.invalid`, fullName: "Phase 4 Individual Assistant" },
  ];
  const auditIds: string[] = [];
  let seeded = false;

  try {
    await prisma.$connect();
    const [{ name }] = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    assert.equal(name, "jurismind_auth_test", "never run integration tests against jurismind_dev");
    await prisma.$transaction(async (tx) => {
      await tx.practiceWorkspace.create({ data: { id: workspaceId, name: "Phase 4 Test Firm", slug, kind: "FIRM" } });
      await tx.practiceWorkspace.create({ data: { id: otherWorkspaceId, name: "Phase 4 Other Firm", slug: otherSlug, kind: "FIRM" } });
      await tx.practiceWorkspace.create({ data: { id: individualWorkspaceId, name: "Phase 4 Individual Practice", slug: individualSlug, kind: "INDIVIDUAL" } });
      await tx.user.createMany({ data: userRows.map((user) => ({ ...user, emailNormalized: user.email })) });
      await tx.userSession.createMany({ data: Object.entries(sessionIds).map(([userId, id]) => ({
        id, userId, tokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })) });
      await tx.userSession.createMany({ data: [revokedSessionId, racingSessionId].map((id) => ({
        id, userId: adminId, tokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })) });
      await tx.practiceMembership.createMany({ data: [
        { id: adminMembershipId, workspaceId, userId: adminId, role: "FIRM_ADMIN", status: "ACTIVE" },
        { id: pendingMembershipId, workspaceId, userId: pendingId, role: "LAWYER", status: "INVITED" },
        { id: lawyerAMembershipId, workspaceId, userId: lawyerAId, role: "LAWYER", status: "ACTIVE" },
        { id: lawyerBMembershipId, workspaceId, userId: lawyerBId, role: "LAWYER", status: "ACTIVE" },
      ] });
      await tx.practiceMembership.create({ data: { id: invitedAssistantMembershipId, workspaceId,
        userId: invitedAssistantId, role: "ASSISTANT", status: "INVITED" } });
      await tx.practiceMembership.create({ data: { id: otherLawyerMembershipId, workspaceId: otherWorkspaceId,
        userId: otherLawyerId, role: "LAWYER", status: "ACTIVE" } });
      await tx.practiceMembership.create({ data: { id: individualLawyerMembershipId, workspaceId: individualWorkspaceId,
        userId: individualLawyerId, role: "LAWYER", status: "ACTIVE" } });
      await tx.lawyerProfile.createMany({ data: [
        { id: randomUUID(), workspaceId, membershipId: lawyerAMembershipId },
        { id: randomUUID(), workspaceId, membershipId: lawyerBMembershipId },
      ] });
      await tx.lawyerProfile.create({ data: { id: randomUUID(), workspaceId: otherWorkspaceId,
        membershipId: otherLawyerMembershipId } });
      await tx.lawyerProfile.create({ data: { id: randomUUID(), workspaceId: individualWorkspaceId,
        membershipId: individualLawyerMembershipId, isPrimary: true } });
      await tx.practiceMembership.createMany({ data: [
        { id: assistantMembershipId, workspaceId, userId: assistantId, role: "ASSISTANT", status: "ACTIVE",
          supervisingLawyerMembershipId: lawyerAMembershipId },
        { id: concurrentMembershipId, workspaceId, userId: concurrentId, role: "ASSISTANT", status: "ACTIVE",
          supervisingLawyerMembershipId: lawyerAMembershipId },
      ] });
      await tx.practiceMembership.create({ data: { id: individualAssistantMembershipId, workspaceId: individualWorkspaceId,
        userId: individualAssistantId, role: "ASSISTANT", status: "SUSPENDED" } });
    });
    seeded = true;

    const service = new MembershipsService(prisma as unknown as PrismaService,
      new AuthorizationContextService(prisma as unknown as PrismaService), new AuthorizationService());
    const changeRole = (workspace: string, member: string, actor: string, role: "LAWYER" | "ASSISTANT" | "FIRM_ADMIN", requestId: string) =>
      service.changeRole(workspace, member, actor, sessionIds[actor]!, role, requestId);
    const suspend = (workspace: string, member: string, actor: string, requestId: string) =>
      service.suspend(workspace, member, actor, sessionIds[actor]!, requestId);
    const reinstate = (workspace: string, member: string, actor: string, requestId: string) =>
      service.reinstate(workspace, member, actor, sessionIds[actor]!, requestId);
    const listAssistants = (workspace: string, lawyer: string, actor: string) =>
      service.assistantsForLawyer(workspace, lawyer, actor, sessionIds[actor]!);
    const assign = (workspace: string, assistant: string, actor: string, supervisor: string, requestId: string) =>
      service.assignAssistant(workspace, assistant, actor, sessionIds[actor]!, supervisor, requestId);

    const invitedAssignmentRequest = randomUUID(); auditIds.push(invitedAssignmentRequest);
    const preparedInvite = await assign(workspaceId, invitedAssistantMembershipId, adminId,
      lawyerAMembershipId, invitedAssignmentRequest);
    assert.equal(preparedInvite.status, "INVITED", "supervisor can be prepared without activating an invitee");
    assert.equal(preparedInvite.supervisingLawyerMembershipId, lawyerAMembershipId);
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: invitedAssignmentRequest } }), 1);

    const badAssignmentRequest = randomUUID(); auditIds.push(badAssignmentRequest);
    await assert.rejects(assign(workspaceId, assistantMembershipId, adminId, adminMembershipId, badAssignmentRequest));
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: assistantMembershipId } })).supervisingLawyerMembershipId,
      lawyerAMembershipId, "failed assignment leaves original supervisor untouched");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: badAssignmentRequest } }), 0,
      "failed transaction writes no success audit");

    const crossWorkspaceRequest = randomUUID(); auditIds.push(crossWorkspaceRequest);
    await assert.rejects(assign(workspaceId, assistantMembershipId, adminId,
      otherLawyerMembershipId, crossWorkspaceRequest), BadRequestException);
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: crossWorkspaceRequest } }), 0);

    const lawyerRequest = randomUUID(); auditIds.push(lawyerRequest);
    await assert.rejects(assign(workspaceId, assistantMembershipId, lawyerBId, lawyerBMembershipId, lawyerRequest), ForbiddenException);
    assert.ok((await listAssistants(workspaceId, lawyerAMembershipId, lawyerAId))
      .some((row) => row.id === assistantMembershipId));
    await assert.rejects(listAssistants(workspaceId, lawyerBMembershipId, lawyerAId), ForbiddenException);

    const blockLawyerRequest = randomUUID(); auditIds.push(blockLawyerRequest);
    await assert.rejects(suspend(workspaceId, lawyerAMembershipId, adminId, blockLawyerRequest), ConflictException);
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: lawyerAMembershipId } })).status, "ACTIVE");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: blockLawyerRequest } }), 0);

    const reassignRequest = randomUUID(); auditIds.push(reassignRequest);
    const reassigned = await assign(workspaceId, assistantMembershipId, adminId, lawyerBMembershipId, reassignRequest);
    assert.equal(reassigned.supervisingLawyerMembershipId, lawyerBMembershipId);
    const assignmentAudit = await prisma.securityAuditEvent.findFirst({
      where: { requestId: reassignRequest, eventType: "ASSISTANT_SUPERVISOR_REASSIGNED" },
    });
    assert.ok(assignmentAudit);
    assert.equal(assignmentAudit.actorUserId, adminId);
    assert.equal(assignmentAudit.workspaceId, workspaceId);
    assert.equal(assignmentAudit.targetId, assistantMembershipId);
    assert.ok(assignmentAudit.createdAt instanceof Date);
    assert.equal(JSON.stringify(assignmentAudit.metadata).includes("password"), false);
    assert.equal((await listAssistants(workspaceId, lawyerAMembershipId, lawyerAId))
      .some((row) => row.id === assistantMembershipId), false,
    "old supervisor no longer sees inherited assistant relationship");
    assert.equal((await listAssistants(workspaceId, lawyerBMembershipId, lawyerBId)).length, 1);

    const suspendAssistantRequest = randomUUID(); auditIds.push(suspendAssistantRequest);
    assert.equal((await suspend(workspaceId, assistantMembershipId, adminId, suspendAssistantRequest)).status, "SUSPENDED");
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: assistantMembershipId } })).supervisingLawyerMembershipId,
      null, "suspending an assistant revokes the active supervisor relationship");
    const reinstateAssistantRequest = randomUUID(); auditIds.push(reinstateAssistantRequest);
    const reinstated = await assign(workspaceId, assistantMembershipId, adminId, lawyerAMembershipId, reinstateAssistantRequest);
    assert.equal(reinstated.status, "ACTIVE");
    assert.equal(reinstated.supervisingLawyerMembershipId, lawyerAMembershipId);

    const individualAssignmentRequest = randomUUID(); auditIds.push(individualAssignmentRequest);
    const individualAssignment = await assign(individualWorkspaceId, individualAssistantMembershipId,
      individualLawyerId, individualLawyerMembershipId, individualAssignmentRequest);
    assert.equal(individualAssignment.status, "ACTIVE", "an individual-practice lawyer can reinstate and assign an assistant they supervise");

    const concurrentRequestA = randomUUID(); const concurrentRequestB = randomUUID();
    auditIds.push(concurrentRequestA, concurrentRequestB);
    const outcomes = await Promise.allSettled([
      assign(workspaceId, concurrentMembershipId, adminId, lawyerAMembershipId, concurrentRequestA),
      assign(workspaceId, concurrentMembershipId, adminId, lawyerBMembershipId, concurrentRequestB),
    ]);
    assert.ok(outcomes.some((result) => result.status === "fulfilled"), "at least one serialized assignment completes");
    const finalConcurrent = await prisma.practiceMembership.findUniqueOrThrow({ where: { id: concurrentMembershipId } });
    assert.ok(finalConcurrent.supervisingLawyerMembershipId === lawyerAMembershipId
      || finalConcurrent.supervisingLawyerMembershipId === lawyerBMembershipId);
    assert.equal(finalConcurrent.status, "ACTIVE");
    const successAudits = await prisma.securityAuditEvent.count({ where: { requestId: { in: [concurrentRequestA, concurrentRequestB] } } });
    assert.equal(successAudits, outcomes.filter((result) => result.status === "fulfilled").length,
      "only committed assignments have audit events");

    const created = await prisma.practiceMembership.findUniqueOrThrow({ where: { id: pendingMembershipId } });
    await assert.rejects(changeRole(workspaceId, adminMembershipId, adminId, "LAWYER", randomUUID()), ForbiddenException);
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: adminMembershipId } })).role, "FIRM_ADMIN",
      "a failed self role change does not partially update the member");

    // Model a request that passed the session guard before its exact session is revoked.
    const priorContext = await new AuthorizationContextService(prisma as unknown as PrismaService).resolveForUser(adminId);
    assert.ok(priorContext, "the actor had valid workspace context before logout/revocation");
    const revokedRequestId = randomUUID(); auditIds.push(revokedRequestId);
    await prisma.userSession.update({ where: { id: revokedSessionId }, data: { revokedAt: new Date() } });
    await assert.rejects(service.suspend(workspaceId, created.id, adminId, revokedSessionId, revokedRequestId), UnauthorizedException);
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: created.id } })).status, "INVITED");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: revokedRequestId } }), 0,
      "a revoked request session cannot commit a membership change or success audit");

    // Revoke the session while an authorized write is blocked on its row lock.
    const racingRequestId = randomUUID(); auditIds.push(racingRequestId);
    let racingMutation: Promise<unknown> | undefined;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM user_sessions WHERE id = ${racingSessionId}::uuid FOR UPDATE`;
      racingMutation = service.suspend(workspaceId, created.id, adminId, racingSessionId, racingRequestId);
      await new Promise((resolve) => setTimeout(resolve, 75));
      await tx.userSession.update({ where: { id: racingSessionId }, data: { revokedAt: new Date() } });
    });
    assert.ok(racingMutation);
    await assert.rejects(racingMutation, (error: { status?: number }) => error.status === 401 || error.status === 409);
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: created.id } })).status, "INVITED");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: racingRequestId } }), 0,
      "revocation racing with a blocked write commits no membership audit");

    // Role changes and suspension on the same pending membership must serialize cleanly.
    const concurrentMembershipRequest = randomUUID(); const concurrentRoleRequest = randomUUID();
    auditIds.push(concurrentMembershipRequest, concurrentRoleRequest);
    const membershipOutcomes = await Promise.allSettled([
      suspend(workspaceId, created.id, adminId, concurrentMembershipRequest),
      changeRole(workspaceId, created.id, adminId, "ASSISTANT", concurrentRoleRequest),
    ]);
    assert.ok(membershipOutcomes.some((result) => result.status === "fulfilled"));
    const lifecycleResult = await prisma.practiceMembership.findUniqueOrThrow({ where: { id: created.id } });
    assert.ok(lifecycleResult.status === "SUSPENDED" || lifecycleResult.status === "INVITED");
    assert.ok(lifecycleResult.role === "LAWYER" || lifecycleResult.role === "ASSISTANT");
    const lifecycleSuccessAudits = await prisma.securityAuditEvent.count({
      where: { requestId: { in: [concurrentMembershipRequest, concurrentRoleRequest] } },
    });
    assert.equal(lifecycleSuccessAudits, membershipOutcomes.filter((result) => result.status === "fulfilled").length,
      "each committed role/status mutation has one success audit; aborted attempts have none");

    const duplicateRequestA = randomUUID(); const duplicateRequestB = randomUUID();
    auditIds.push(duplicateRequestA, duplicateRequestB);
    const duplicateSuspensions = await Promise.allSettled([
      suspend(workspaceId, created.id, adminId, duplicateRequestA),
      suspend(workspaceId, created.id, adminId, duplicateRequestB),
    ]);
    assert.ok(duplicateSuspensions.some((result) => result.status === "fulfilled"));
    const duplicateAudits = await prisma.securityAuditEvent.count({
      where: { requestId: { in: [duplicateRequestA, duplicateRequestB] }, eventType: "WORKSPACE_MEMBERSHIP_SUSPENDED" },
    });
    assert.ok(duplicateAudits <= 1, "idempotent duplicate suspension emits at most one transition audit");

    const moveFirstAssistantRequest = randomUUID(); auditIds.push(moveFirstAssistantRequest);
    await assign(workspaceId, assistantMembershipId, adminId, lawyerBMembershipId, moveFirstAssistantRequest);
    const supervisorResetRequest = randomUUID(); auditIds.push(supervisorResetRequest);
    await assign(workspaceId, concurrentMembershipId, adminId, lawyerAMembershipId, supervisorResetRequest);
    const deactivationRequest = randomUUID(); const transferRequest = randomUUID();
    auditIds.push(deactivationRequest, transferRequest);
    const supervisorRace = await Promise.allSettled([
      suspend(workspaceId, lawyerAMembershipId, adminId, deactivationRequest),
      assign(workspaceId, concurrentMembershipId, adminId, lawyerBMembershipId, transferRequest),
    ]);
    assert.equal(supervisorRace[1]?.status, "fulfilled", "assistant transfer remains possible in either serialization order");
    const deactivationAuditCount = await prisma.securityAuditEvent.count({ where: { requestId: deactivationRequest } });
    const transferAuditCount = await prisma.securityAuditEvent.count({ where: { requestId: transferRequest } });
    assert.equal(deactivationAuditCount, supervisorRace[0]?.status === "fulfilled" ? 1 : 0,
      "supervisor deactivation is audited only when committed");
    assert.equal(transferAuditCount, supervisorRace[1]?.status === "fulfilled" ? 1 : 0,
      "assistant transfer is audited only when committed");
    const lawyerAfterRace = await prisma.practiceMembership.findUniqueOrThrow({ where: { id: lawyerAMembershipId } });
    const assistantAfterRace = await prisma.practiceMembership.findUniqueOrThrow({ where: { id: concurrentMembershipId } });
    assert.equal(assistantAfterRace.supervisingLawyerMembershipId, lawyerBMembershipId);
    if (lawyerAfterRace.status === "SUSPENDED") {
      assert.equal(await prisma.practiceMembership.count({ where: {
        workspaceId, role: "ASSISTANT", status: "ACTIVE", supervisingLawyerMembershipId: lawyerAMembershipId,
      } }), 0, "a deactivated lawyer has no active supervised assistants");
    } else {
      assert.equal(lawyerAfterRace.status, "ACTIVE");
      const failedDeactivationAudits = await prisma.securityAuditEvent.count({ where: { requestId: deactivationRequest } });
      assert.equal(failedDeactivationAudits, 0, "blocked lawyer deactivation has no success audit");
    }

    // The previously active Lawyer cannot keep authorizing after membership suspension.
    if (lawyerAfterRace.status === "ACTIVE") await suspend(workspaceId, lawyerAMembershipId, adminId, randomUUID());
    await assert.rejects(listAssistants(workspaceId, lawyerAMembershipId, lawyerAId), ForbiddenException);

    // Workspace suspension invalidates its members for subsequent operations.
    await prisma.practiceWorkspace.update({ where: { id: workspaceId }, data: { status: "SUSPENDED" } });
  } finally {
    if (seeded) await prisma.$transaction(async (tx) => {
      await tx.securityAuditEvent.deleteMany({ where: { requestId: { in: auditIds } } });
      await tx.securityAuditEvent.deleteMany({ where: { actorUserId: { in: userRows.map((u) => u.id) } } });
      await tx.practiceMembership.updateMany({ where: { workspaceId, role: "ASSISTANT" },
        data: { status: "SUSPENDED", supervisingLawyerMembershipId: null } });
      await tx.practiceMembership.updateMany({ where: { workspaceId: { in: [otherWorkspaceId, individualWorkspaceId] }, role: "ASSISTANT" },
        data: { status: "SUSPENDED", supervisingLawyerMembershipId: null } });
      await tx.practiceMembership.deleteMany({ where: { workspaceId, role: "ASSISTANT" } });
      await tx.practiceMembership.deleteMany({ where: { workspaceId: { in: [otherWorkspaceId, individualWorkspaceId] }, role: "ASSISTANT" } });
      await tx.lawyerProfile.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId, individualWorkspaceId] } } });
      await tx.practiceMembership.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId, individualWorkspaceId] } } });
      await tx.userSession.deleteMany({ where: { userId: { in: userRows.map((u) => u.id) } } });
      await tx.practiceWorkspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId, individualWorkspaceId] } } });
      await tx.user.deleteMany({ where: { id: { in: userRows.map((u) => u.id) } } });
    });
    await prisma.$disconnect();
  }
});
