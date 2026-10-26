import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { test } from "node:test";
import { ConflictException, ForbiddenException, GoneException, UnauthorizedException } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AuthorizationContextService } from "../src/authorization/authorization-context.service";
import { AuthorizationService } from "../src/authorization/authorization.service";
import { Permission } from "../src/authorization/permissions";
import { InvitationsService, hashInvitationToken } from "../src/memberships/invitations.service";
import { MembershipsService } from "../src/memberships/memberships.service";
import { UnconfiguredInvitationDelivery } from "../src/memberships/invitation-delivery";
import type { PrismaService } from "../src/database/prisma.service";

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (databaseUrl && new URL(databaseUrl).pathname.slice(1) !== "jurismind_auth_test") {
  throw new Error("Safety stop: invitation integration tests require jurismind_auth_test.");
}

test("invitation lifecycle is identity-bound, single-use, audited, and transactional in PostgreSQL", {
  skip: !databaseUrl ? "Set AUTH_TEST_DATABASE_URL to the dedicated jurismind_auth_test database." : false,
}, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const workspaceId = randomUUID();
  const otherWorkspaceId = randomUUID();
  const individualWorkspaceId = randomUUID();
  const slug = `invite-${randomUUID()}`;
  const otherSlug = `invite-other-${randomUUID()}`;
  const individualSlug = `invite-individual-${randomUUID()}`;
  const ids = { admin: randomUUID(), lawyer: randomUUID(), recipient: randomUUID(), other: randomUUID(), assistant: randomUUID(),
    lawyerInvitee: randomUUID(), individualLawyer: randomUUID(), individualInvitee: randomUUID() };
  const membershipIds = { admin: randomUUID(), lawyer: randomUUID(), otherLawyer: randomUUID(), assistant: randomUUID() };
  const sessionIds = Object.fromEntries(Object.values(ids).map((id) => [id, randomUUID()])) as Record<string, string>;
  const emails = Object.fromEntries(Object.entries(ids).map(([key]) => [key, `${key}-${randomUUID()}@example.invalid`])) as Record<string, string>;
  const requestIds: string[] = [];
  let seeded = false;
  let triggerInstalled = false;

  try {
    await prisma.$connect();
    const [{ name }] = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    assert.equal(name, "jurismind_auth_test", "invitation integration tests may not use jurismind_dev");
    await prisma.$transaction(async (tx) => {
      await tx.practiceWorkspace.createMany({ data: [
        { id: workspaceId, name: "Invitation Firm", slug, kind: "FIRM" },
        { id: otherWorkspaceId, name: "Other Invitation Firm", slug: otherSlug, kind: "FIRM" },
        { id: individualWorkspaceId, name: "Individual Invitation Practice", slug: individualSlug, kind: "INDIVIDUAL" },
      ] });
      await tx.user.createMany({ data: Object.entries(ids).map(([key, id]) => ({
        id, email: emails[key]!, emailNormalized: emails[key]!.toLowerCase(), fullName: key,
        passwordHash: "$argon2id$test-placeholder",
      })) });
      await tx.userSession.createMany({ data: Object.entries(ids).map(([key, id]) => ({
        id: sessionIds[id]!, userId: id,
        tokenHash: createHash("sha256").update(`${key}-${randomUUID()}`).digest("hex"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })) });
      await tx.practiceMembership.createMany({ data: [
        { id: membershipIds.admin, workspaceId, userId: ids.admin, role: "FIRM_ADMIN", status: "ACTIVE" },
        { id: membershipIds.lawyer, workspaceId, userId: ids.lawyer, role: "LAWYER", status: "ACTIVE" },
        { id: membershipIds.otherLawyer, workspaceId: otherWorkspaceId, userId: ids.other, role: "LAWYER", status: "ACTIVE" },
        { id: randomUUID(), workspaceId: individualWorkspaceId, userId: ids.individualLawyer, role: "LAWYER", status: "ACTIVE" },
      ] });
      const individualMembership = await tx.practiceMembership.findUniqueOrThrow({
        where: { workspaceId_userId: { workspaceId: individualWorkspaceId, userId: ids.individualLawyer } }, select: { id: true },
      });
      await tx.lawyerProfile.createMany({ data: [
        { workspaceId, membershipId: membershipIds.lawyer },
        { workspaceId: otherWorkspaceId, membershipId: membershipIds.otherLawyer },
        { workspaceId: individualWorkspaceId, membershipId: individualMembership.id, isPrimary: true },
      ] });
      await tx.practiceMembership.create({ data: {
        id: membershipIds.assistant, workspaceId, userId: ids.assistant, role: "ASSISTANT", status: "INVITED",
      } });
    });
    seeded = true;

    const contexts = new AuthorizationContextService(prisma as unknown as PrismaService);
    const authorization = new AuthorizationService();
    const service = new InvitationsService(prisma as unknown as PrismaService, contexts, authorization, {
      nodeEnv: "development", trustedOrigins: ["http://localhost:3000"], sessionTtlSeconds: 3600,
      passwordMinLength: 12, loginRateLimitMax: 5, loginRateLimitWindowSeconds: 900,
      invitationDevTokenDelivery: true,
    }, new UnconfiguredInvitationDelivery());
    const membershipService = new MembershipsService(prisma as unknown as PrismaService, contexts, authorization);
    const create = (workspace: string, actor: string, recipient: string, role: "LAWYER" | "ASSISTANT",
      request = randomUUID(), supervisorMembershipId?: string) => {
      requestIds.push(request);
      return service.create(workspace, actor, sessionIds[actor]!, { userId: recipient, role,
        ...(supervisorMembershipId ? { supervisorMembershipId } : {}) }, request);
    };
    const accept = (token: string, actor: string, request = randomUUID()) => {
      requestIds.push(request);
      return service.accept(token, actor, sessionIds[actor]!, request);
    };

    const created = await create(workspaceId, ids.admin, ids.recipient, "LAWYER");
    assert.equal(created.delivery, "development_token");
    assert.ok(created.developmentToken);
    const invitation = await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: created.invitationId } });
    assert.equal(invitation.tokenHash, hashInvitationToken(created.developmentToken!));
    assert.equal(invitation.tokenHash.includes(created.developmentToken!), false, "raw token is never persisted");
    assert.equal(invitation.intendedEmail, emails.recipient!.toLowerCase());
    assert.equal(invitation.role, "LAWYER");
    assert.equal(invitation.createdById, ids.admin);
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: invitation.membershipId } })).status, "INVITED");
    const recipientContextBefore = await contexts.resolveForUser(ids.recipient);
    assert.equal(recipientContextBefore?.memberships.some((item) => item.workspaceId === workspaceId), false,
      "an invited identity receives no workspace access before acceptance");

    await assert.rejects(create(workspaceId, ids.recipient, ids.other, "LAWYER"));
    await assert.rejects(create(workspaceId, ids.lawyer, ids.other, "LAWYER"), ForbiddenException);
    await assert.rejects(create(otherWorkspaceId, ids.admin, ids.other, "LAWYER"));

    const mismatchRequest = randomUUID();
    await assert.rejects(accept(created.developmentToken!, ids.other, mismatchRequest), GoneException,
      "wrong authenticated identity cannot accept");
    const mismatchAudit = await prisma.securityAuditEvent.findFirst({ where: { requestId: mismatchRequest } });
    assert.equal(mismatchAudit?.eventType, "WORKSPACE_INVITATION_REJECTED");
    assert.equal(mismatchAudit?.actorUserId, ids.other);
    assert.equal(JSON.stringify(mismatchAudit?.metadata).includes(created.developmentToken!), false,
      "rejection audit does not contain the token");
    await assert.rejects(accept("unknown-token", ids.recipient), UnauthorizedException);
    const acceptedRequest = randomUUID();
    const accepted = await accept(created.developmentToken!, ids.recipient, acceptedRequest);
    assert.equal(accepted.accepted, true);
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: invitation.membershipId } })).status, "ACTIVE");
    assert.equal((await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: invitation.id } })).status, "ACCEPTED");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: acceptedRequest, eventType: "WORKSPACE_INVITATION_ACCEPTED" } }), 1);
    const acceptedContext = await contexts.resolveForUser(ids.recipient);
    assert.ok(acceptedContext);
    assert.equal(authorization.hasPermission(acceptedContext, Permission.AccessLawyerPrivateResources, workspaceId), false,
      "invitation acceptance does not create matter access");
    assert.equal(await prisma.platformRoleGrant.count({ where: { userId: ids.recipient } }), 0,
      "practice invitation acceptance cannot create platform privileges");

    await assert.rejects(create(individualWorkspaceId, ids.individualLawyer, ids.individualInvitee, "LAWYER"), ForbiddenException,
      "an individual-practice invitation cannot become a lawyer invitation");
    const individualAssistantInvite = await create(individualWorkspaceId, ids.individualLawyer, ids.individualInvitee, "ASSISTANT");
    const individualAssistantMembership = await prisma.practiceMembership.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: individualWorkspaceId, userId: ids.individualInvitee } },
    });
    assert.equal(individualAssistantMembership.status, "INVITED");
    assert.ok(individualAssistantMembership.supervisingLawyerMembershipId,
      "individual-practice assistant invitation is prepared under its primary lawyer");
    await accept(individualAssistantInvite.developmentToken!, ids.individualInvitee);
    assert.deepEqual(await accept(created.developmentToken!, ids.recipient), {
      accepted: true, workspaceId, membershipId: invitation.membershipId,
    }, "the recipient can safely confirm a committed acceptance after a lost response");
    assert.equal(await prisma.securityAuditEvent.count({ where: {
      targetId: created.invitationId, eventType: "WORKSPACE_INVITATION_ACCEPTED",
    } }), 1, "acceptance replay does not duplicate the success audit");

    const replacement = await create(workspaceId, ids.admin, ids.assistant, "ASSISTANT", randomUUID(), membershipIds.lawyer);
    const assistantInvitation = await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: replacement.invitationId } });
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: membershipIds.assistant } }))
      .supervisingLawyerMembershipId, membershipIds.lawyer,
    "assistant invitation persists its active same-workspace supervising lawyer");
    await prisma.practiceMembership.update({ where: { id: membershipIds.assistant }, data: { supervisingLawyerMembershipId: null } });
    await assert.rejects(accept(replacement.developmentToken!, ids.assistant), GoneException,
      "assistant invitation cannot activate before a valid supervisor is assigned");
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: membershipIds.assistant } })).status, "INVITED");
    await membershipService.assignAssistant(workspaceId, membershipIds.assistant, ids.admin, sessionIds[ids.admin]!,
      membershipIds.lawyer, randomUUID());
    const assistantAccepted = await accept(replacement.developmentToken!, ids.assistant);
    assert.equal(assistantAccepted.accepted, true);
    const assistant = await prisma.practiceMembership.findUniqueOrThrow({ where: { id: membershipIds.assistant } });
    assert.equal(assistant.status, "ACTIVE");
    assert.equal(assistant.supervisingLawyerMembershipId, membershipIds.lawyer);

    const lawyerInvite = await create(workspaceId, ids.lawyer, ids.lawyerInvitee, "ASSISTANT");
    const lawyerInvitedMembership = await prisma.practiceMembership.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId: ids.lawyerInvitee } },
    });
    assert.equal(lawyerInvitedMembership.status, "INVITED");
    assert.equal(lawyerInvitedMembership.supervisingLawyerMembershipId, membershipIds.lawyer,
      "a lawyer may invite an assistant only under their own supervision");
    await accept(lawyerInvite.developmentToken!, ids.lawyerInvitee);

    const revoked = await create(workspaceId, ids.admin, ids.other, "LAWYER");
    const revokedMembership = await prisma.practiceMembership.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId: ids.other } },
    });
    await prisma.practiceMembership.update({ where: { id: revokedMembership.id }, data: {
      role: "ASSISTANT", supervisingLawyerMembershipId: membershipIds.lawyer,
    } });
    await assert.rejects(accept(revoked.developmentToken!, ids.other), GoneException,
      "changing the membership role cannot change the role frozen in an invitation");
    const roleReplacement = await create(workspaceId, ids.admin, ids.other, "LAWYER");
    const roleReplacedMembership = await prisma.practiceMembership.findUniqueOrThrow({ where: { id: revokedMembership.id } });
    assert.equal(roleReplacedMembership.role, "LAWYER");
    assert.equal(roleReplacedMembership.supervisingLawyerMembershipId, null,
      "replacing an assistant invitation with a lawyer invitation clears its assistant-only supervisor relation");
    await assert.rejects(accept(revoked.developmentToken!, ids.other), GoneException);
    await service.revoke(workspaceId, roleReplacement.invitationId, ids.admin, sessionIds[ids.admin]!, randomUUID());

    await assert.rejects(create(workspaceId, ids.admin, ids.lawyer, "LAWYER"), ConflictException,
      "active existing members cannot be invited again");
    const expiryInvite = await create(workspaceId, ids.admin, ids.other, "LAWYER").catch(() => null);
    // The prior target is already invited by the revoked invitation, so creation replaces its old token.
    assert.ok(expiryInvite);
    const expiryRecord = await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: expiryInvite!.invitationId } });
    const expiryBase = Date.now();
    await prisma.workspaceInvitation.update({ where: { id: expiryRecord.id }, data: {
      createdAt: new Date(expiryBase - 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(expiryBase - 24 * 60 * 60 * 1000),
    } });
    await assert.rejects(accept(expiryInvite!.developmentToken!, ids.other), GoneException);
    assert.equal((await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: expiryRecord.id } })).status, "EXPIRED");

    await assert.rejects(create(workspaceId, ids.admin, ids.recipient, "LAWYER"), /membership already exists/,
      "active membership cannot receive a new invitation");

    const raceUserId = randomUUID();
    const raceEmail = `race-${randomUUID()}@example.invalid`;
    await prisma.user.create({ data: { id: raceUserId, email: raceEmail, emailNormalized: raceEmail,
      fullName: "Concurrent Invitee", passwordHash: "$argon2id$test-placeholder" } });
    const raceSessionId = randomUUID();
    await prisma.userSession.create({ data: { id: raceSessionId, userId: raceUserId,
      tokenHash: createHash("sha256").update(randomUUID()).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
    sessionIds[raceUserId] = raceSessionId;
    const raceInvite = await create(workspaceId, ids.admin, raceUserId, "LAWYER");
    const duplicateAccepts = await Promise.allSettled([
      accept(raceInvite.developmentToken!, raceUserId), accept(raceInvite.developmentToken!, raceUserId),
    ]);
    assert.equal(duplicateAccepts.filter((result) => result.status === "fulfilled").length, 1,
      "only one concurrent acceptance can consume an invitation");
    assert.equal(await prisma.securityAuditEvent.count({ where: {
      targetId: raceInvite.invitationId, eventType: "WORKSPACE_INVITATION_ACCEPTED",
    } }), 1);

    const noDeliveryUserId = randomUUID();
    const noDeliveryEmail = `no-delivery-${randomUUID()}@example.invalid`;
    await prisma.user.create({ data: { id: noDeliveryUserId, email: noDeliveryEmail, emailNormalized: noDeliveryEmail,
      fullName: "No Delivery Recipient", passwordHash: "$argon2id$test-placeholder" } });
    const noDeliverySessionId = randomUUID();
    await prisma.userSession.create({ data: { id: noDeliverySessionId, userId: noDeliveryUserId,
      tokenHash: createHash("sha256").update(randomUUID()).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
    sessionIds[noDeliveryUserId] = noDeliverySessionId;
    const productionDeliveryService = new InvitationsService(prisma as unknown as PrismaService, contexts, authorization, {
      nodeEnv: "production", trustedOrigins: ["https://app.example.invalid"], sessionTtlSeconds: 3600,
      passwordMinLength: 12, loginRateLimitMax: 5, loginRateLimitWindowSeconds: 900,
      invitationDevTokenDelivery: false,
    }, new UnconfiguredInvitationDelivery());
    const noDeliveryRequest = randomUUID(); requestIds.push(noDeliveryRequest);
    const notDelivered = await productionDeliveryService.create(workspaceId, ids.admin, sessionIds[ids.admin]!,
      { userId: noDeliveryUserId, role: "LAWYER" }, noDeliveryRequest);
    assert.equal(notDelivered.delivery, "not_configured");
    assert.equal("developmentToken" in notDelivered, false, "tokens are never returned outside explicit development delivery");

    // Force the success-audit insert to fail, then assert all acceptance writes roll back.
    const rollbackRecipientId = randomUUID();
    const rollbackEmail = `rollback-${randomUUID()}@example.invalid`;
    await prisma.user.create({ data: { id: rollbackRecipientId, email: rollbackEmail, emailNormalized: rollbackEmail,
      fullName: "Rollback Recipient", passwordHash: "$argon2id$test-placeholder" } });
    const rollbackSessionId = randomUUID();
    await prisma.userSession.create({ data: { id: rollbackSessionId, userId: rollbackRecipientId,
      tokenHash: createHash("sha256").update(randomUUID()).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
    sessionIds[rollbackRecipientId] = rollbackSessionId;
    const rollbackInvite = await create(workspaceId, ids.admin, rollbackRecipientId, "LAWYER");
    const rollbackMembership = await prisma.practiceMembership.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId: rollbackRecipientId } },
    });
    await prisma.$executeRawUnsafe(`CREATE FUNCTION phase6_reject_accept_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type = 'WORKSPACE_INVITATION_ACCEPTED' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`);
    await prisma.$executeRawUnsafe("CREATE TRIGGER phase6_reject_accept_audit BEFORE INSERT ON security_audit_events FOR EACH ROW EXECUTE FUNCTION phase6_reject_accept_audit()");
    triggerInstalled = true;
    const rollbackAcceptanceRequest = randomUUID(); requestIds.push(rollbackAcceptanceRequest);
    await assert.rejects(service.accept(rollbackInvite.developmentToken!, rollbackRecipientId,
      rollbackSessionId, rollbackAcceptanceRequest));
    assert.equal((await prisma.practiceMembership.findUniqueOrThrow({ where: { id: rollbackMembership.id } })).status, "INVITED");
    assert.equal((await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: rollbackInvite.invitationId } })).status, "PENDING");
    assert.equal(await prisma.securityAuditEvent.count({ where: { requestId: rollbackAcceptanceRequest } }), 0,
      "audit write failure leaves no success event");
    await prisma.$executeRawUnsafe("DROP TRIGGER phase6_reject_accept_audit ON security_audit_events");
    await prisma.$executeRawUnsafe("DROP FUNCTION phase6_reject_accept_audit()");
    triggerInstalled = false;

    await prisma.practiceWorkspace.update({ where: { id: workspaceId }, data: { status: "SUSPENDED" } });
    await assert.rejects(create(workspaceId, ids.admin, ids.other, "LAWYER"), ForbiddenException,
      "a suspended workspace cannot authorize invitation creation");
  } finally {
    if (triggerInstalled) {
      await prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS phase6_reject_accept_audit ON security_audit_events").catch(() => undefined);
      await prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS phase6_reject_accept_audit()").catch(() => undefined);
    }
    if (seeded) await prisma.$transaction(async (tx) => {
      await tx.securityAuditEvent.deleteMany({ where: { OR: [
        { requestId: { in: requestIds } }, { workspaceId: { in: [workspaceId, otherWorkspaceId, individualWorkspaceId] } },
        { actorUserId: { in: [...Object.values(ids), ...Object.keys(sessionIds)] } },
      ] } });
      await tx.workspaceInvitation.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId, individualWorkspaceId] } } });
      await tx.practiceMembership.updateMany({ where: { workspaceId: { in: [workspaceId, individualWorkspaceId] }, role: "ASSISTANT" },
        data: { status: "SUSPENDED", supervisingLawyerMembershipId: null } });
      await tx.practiceMembership.deleteMany({ where: { workspaceId: { in: [workspaceId, individualWorkspaceId] }, role: "ASSISTANT" } });
      await tx.lawyerProfile.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId, individualWorkspaceId] } } });
      await tx.practiceMembership.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId, individualWorkspaceId] } } });
      await tx.userSession.deleteMany({ where: { userId: { in: [...Object.values(ids), ...Object.keys(sessionIds)] } } });
      await tx.practiceWorkspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId, individualWorkspaceId] } } });
      await tx.user.deleteMany({ where: { id: { in: [...Object.values(ids), ...Object.keys(sessionIds)] } } });
    });
    await prisma.$disconnect();
  }
});
