import { Body, Controller, Get, Headers, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { createRequestId } from "../auth/auth.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { parseIdempotencyKey, parseIndividualPractice } from "./individual-practice.dto";
import { IndividualPracticeService } from "./individual-practice.service";
import { WorkspaceDiscoveryService } from "./workspace-discovery.service";

@Controller("api/workspaces")
@UseGuards(SessionAuthGuard)
export class IndividualPracticeController {
  constructor(@Inject(IndividualPracticeService) private readonly practices: IndividualPracticeService,
    @Inject(WorkspaceDiscoveryService) private readonly workspaces: WorkspaceDiscoveryService) {}

  @Get()
  async listMyWorkspaces(@Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.workspaces.listMine(request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Post("individual-practice")
  @UseGuards(CsrfOriginGuard)
  provision(@Body() body: unknown, @Headers("idempotency-key") key: string | undefined,
    @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.practices.provision(request.authorizationContext!.user.id, request.authenticatedSessionId!,
      parseIndividualPractice(body).name, parseIdempotencyKey(key), createRequestId(request.header("x-request-id")));
  }
}
