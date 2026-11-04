import { Body, Controller, Get, Headers, Inject, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { createRequestId } from "../auth/auth.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { Permission } from "../authorization/permissions";
import { PermissionsGuard } from "../authorization/permissions.guard";
import { RequirePermission } from "../authorization/require-permission.decorator";
import { parseCreatePlatformAdminInput, parsePlatformUserId, parsePlatformUserListQuery, parsePlatformUserStatus, parsePracticeUserListQuery } from "./platform-users.dto";
import { PlatformUsersService } from "./platform-users.service";
import { parseCreatePracticeUserInput } from "./practice-user.dto";

/** Platform-wide account administration; practice roles never authorize these routes. */
@Controller("api/platform-admin/users")
@UseGuards(SessionAuthGuard)
export class PlatformUsersController {
  constructor(@Inject(PlatformUsersService) private readonly users: PlatformUsersService) {}

  @Post()
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequirePermission(Permission.PlatformAdministration)
  create(@Body() body: unknown, @Req() request: AuthorizationRequest,
    @Headers("x-request-id") requestId: string | undefined, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.users.createAdmin(parseCreatePlatformAdminInput(body),
      request.authorizationContext!.user.id, request.authenticatedSessionId!, createRequestId(requestId));
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PlatformAdministration)
  list(@Query() query: Record<string, unknown>, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.users.list(parsePlatformUserListQuery(query), request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Get("practice-accounts")
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PlatformAdministration)
  listPractice(@Query() query: Record<string, unknown>, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.users.listPractice(parsePracticeUserListQuery(query), request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Get("practice-accounts/creation-options")
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PlatformAdministration)
  practiceUserCreationOptions(@Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.users.practiceUserCreationOptions(request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Post("practice-accounts")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequirePermission(Permission.PlatformAdministration)
  @UseInterceptors(FileInterceptor("photo", { limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 20, fieldSize: 4096, parts: 21 } }))
  createPracticeUser(@Body() body: Record<string, unknown>, @UploadedFile() photo: unknown, @Req() request: AuthorizationRequest,
    @Headers("x-request-id") requestId: string | undefined, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.users.createPracticeUser(parseCreatePracticeUserInput(body), photo,
      request.authorizationContext!.user.id, request.authenticatedSessionId!, createRequestId(requestId));
  }

  @Get(":userId/profile-photo")
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.PlatformAdministration)
  async profilePhoto(@Param("userId") userId: string, @Req() request: AuthorizationRequest, @Res() response: Response) {
    const photo = await this.users.profilePhoto(parsePlatformUserId(userId), request.authorizationContext!.user.id, request.authenticatedSessionId!);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Disposition", "inline");
    response.type(photo.mediaType).send(photo.bytes);
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
