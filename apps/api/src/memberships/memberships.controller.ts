import { Body, Controller, Get, Inject, Param, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { createRequestId } from "../auth/auth.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { Permission } from "../authorization/permissions";
import { RequireWorkspacePermission, RequireWorkspacePermissionAnyOf } from "../authorization/require-permission.decorator";
import { PermissionsGuard } from "../authorization/permissions.guard";
import { MembershipsService } from "./memberships.service";
import { InvitationsService } from "./invitations.service";
import { parseAddMembership, parseIdentifier, parseMembershipRole, parseSupervisor } from "./membership.dto";

@Controller("api/workspaces/:workspaceId")
@UseGuards(SessionAuthGuard)
export class MembershipsController {
  constructor(@Inject(MembershipsService) private readonly memberships: MembershipsService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService) {}

  @Get("memberships")
  @UseGuards(PermissionsGuard)
  @RequireWorkspacePermission(Permission.ReadWorkspaceMemberships)
  list(@Param("workspaceId") workspaceId: string, @Req() request: AuthorizationRequest) {
    return this.memberships.list(parseIdentifier(workspaceId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!);
  }

  @Post("memberships")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermissionAnyOf([Permission.ManageWorkspaceMemberships, Permission.ManageAssistantAssignments])
  add(@Param("workspaceId") workspaceId: string, @Body() body: unknown, @Req() request: AuthorizationRequest,
    @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.invitations.create(parseIdentifier(workspaceId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, parseAddMembership(body), createRequestId(request.header("x-request-id")));
  }

  @Post("invitations/:invitationId/revoke")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermission(Permission.ManageWorkspaceMemberships)
  revokeInvitation(@Param("workspaceId") workspaceId: string, @Param("invitationId") invitationId: string,
    @Req() request: AuthorizationRequest) {
    return this.invitations.revoke(parseIdentifier(workspaceId), parseIdentifier(invitationId),
      request.authorizationContext!.user.id, request.authenticatedSessionId!, createRequestId(request.header("x-request-id")));
  }

  @Patch("memberships/:membershipId/role")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermission(Permission.ManageWorkspaceMemberships)
  changeRole(@Param("workspaceId") workspaceId: string, @Param("membershipId") membershipId: string,
    @Body() body: unknown, @Req() request: AuthorizationRequest) {
    return this.memberships.changeRole(parseIdentifier(workspaceId), parseIdentifier(membershipId),
      request.authorizationContext!.user.id, request.authenticatedSessionId!, parseMembershipRole(body),
      createRequestId(request.header("x-request-id")));
  }

  @Post("memberships/:membershipId/suspend")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermission(Permission.ManageWorkspaceMemberships)
  suspend(@Param("workspaceId") workspaceId: string, @Param("membershipId") membershipId: string,
    @Req() request: AuthorizationRequest) {
    return this.memberships.suspend(parseIdentifier(workspaceId), parseIdentifier(membershipId),
      request.authorizationContext!.user.id, request.authenticatedSessionId!, createRequestId(request.header("x-request-id")));
  }

  @Post("memberships/:membershipId/reinstate")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermission(Permission.ManageWorkspaceMemberships)
  reinstate(@Param("workspaceId") workspaceId: string, @Param("membershipId") membershipId: string,
    @Req() request: AuthorizationRequest) {
    return this.memberships.reinstate(parseIdentifier(workspaceId), parseIdentifier(membershipId),
      request.authorizationContext!.user.id, request.authenticatedSessionId!, createRequestId(request.header("x-request-id")));
  }

  @Get("lawyers/:lawyerMembershipId/assistants")
  @UseGuards(PermissionsGuard)
  @RequireWorkspacePermission(Permission.ManageAssistantAssignments)
  assistants(@Param("workspaceId") workspaceId: string, @Param("lawyerMembershipId") lawyerMembershipId: string,
    @Req() request: AuthorizationRequest) {
    return this.memberships.assistantsForLawyer(parseIdentifier(workspaceId), parseIdentifier(lawyerMembershipId),
      request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Post("assistants/:assistantMembershipId/supervisor")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermission(Permission.ManageAssistantAssignments)
  assignSupervisor(@Param("workspaceId") workspaceId: string, @Param("assistantMembershipId") assistantMembershipId: string,
    @Body() body: unknown, @Req() request: AuthorizationRequest) {
    return this.memberships.assignAssistant(parseIdentifier(workspaceId), parseIdentifier(assistantMembershipId),
      request.authorizationContext!.user.id, request.authenticatedSessionId!, parseSupervisor(body),
      createRequestId(request.header("x-request-id")));
  }
}
