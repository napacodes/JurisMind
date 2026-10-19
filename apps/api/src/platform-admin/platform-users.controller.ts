import { Body, Controller, Get, Headers, Inject, Param, Patch, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { createRequestId } from "../auth/auth.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { Permission } from "../authorization/permissions";
import { PermissionsGuard } from "../authorization/permissions.guard";
import { RequirePermission } from "../authorization/require-permission.decorator";
import { parsePlatformUserId, parsePlatformUserListQuery, parsePlatformUserStatus } from "./platform-users.dto";
import { PlatformUsersService } from "./platform-users.service";

/** Platform-wide account administration; practice roles never authorize these routes. */
@Controller("api/platform-admin/users")
@UseGuards(SessionAuthGuard)
export class PlatformUsersController {
  constructor(@Inject(PlatformUsersService) private readonly users: PlatformUsersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PlatformAdministration)
  list(@Query() query: Record<string, unknown>, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.users.list(parsePlatformUserListQuery(query), request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Get(":userId")
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PlatformAdministration)
  get(@Param("userId") userId: string, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.users.get(parsePlatformUserId(userId), request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Patch(":userId/status")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequirePermission(Permission.PlatformAdministration)
  changeStatus(@Param("userId") userId: string, @Body() body: unknown, @Req() request: AuthorizationRequest,
    @Headers("x-request-id") requestId: string | undefined, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.users.changeStatus(parsePlatformUserId(userId), parsePlatformUserStatus(body),
      request.authorizationContext!.user.id, request.authenticatedSessionId!, createRequestId(requestId));
  }
}
