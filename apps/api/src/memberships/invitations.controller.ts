import { Body, Controller, HttpCode, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { createRequestId } from "../auth/auth.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { InvitationsService } from "./invitations.service";
import { parseInvitationAcceptance } from "./membership.dto";

@Controller("api/invitations")
export class InvitationsController {
  constructor(@Inject(InvitationsService) private readonly invitations: InvitationsService) {}

  @Post("accept")
  @HttpCode(200)
  @UseGuards(SessionAuthGuard, CsrfOriginGuard)
  async accept(@Body() body: unknown, @Req() request: AuthorizationRequest & Request,
    @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.invitations.accept(parseInvitationAcceptance(body), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, createRequestId(request.header("x-request-id")));
  }
}
