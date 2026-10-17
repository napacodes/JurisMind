import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService, createRequestId } from "./auth.service";
import { readSessionCookie, sessionCookieName } from "./session-cookie";
export { readSessionCookie, sessionCookieName } from "./session-cookie";
import { CsrfOriginGuard } from "./csrf-origin.guard";
import { AuthEnvironment, AUTH_ENVIRONMENT } from "./auth.types";
import { RequirePermission } from "../authorization/require-permission.decorator";
import { Permission } from "../authorization/permissions";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { PermissionsGuard } from "../authorization/permissions.guard";
import { SessionAuthGuard } from "./session-auth.guard";

@Controller("api/auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
  ) {}

  @Post("login")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard)
  async login(
    @Body() payload: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: { id: string; email: string; fullName: string }; expiresAt: string }> {
    response.setHeader("Cache-Control", "no-store");
    const result = await this.authService.login(
      payload,
      request.ip ?? "unknown",
      createRequestId(request.header("x-request-id")),
    );
    response.cookie(sessionCookieName(this.environment), result.rawSessionToken, {
      httpOnly: true,
      secure: this.environment.nodeEnv === "production",
      sameSite: "lax",
      path: "/",
      expires: result.expiresAt,
    });
    return { user: result.user, expiresAt: result.expiresAt.toISOString() };
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(CsrfOriginGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    response.setHeader("Cache-Control", "no-store");
    await this.authService.logout(
      readSessionCookie(request, sessionCookieName(this.environment)),
      createRequestId(request.header("x-request-id")),
    );
    response.clearCookie(sessionCookieName(this.environment), {
      httpOnly: true,
      secure: this.environment.nodeEnv === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  @Get("me")
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @RequirePermission(Permission.ReadOwnProfile)
  async me(
    @Req() request: AuthorizationRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: { id: string; email: string; fullName: string } }> {
    response.setHeader("Cache-Control", "no-store");
    return { user: request.authorizationContext!.user };
  }

}

