import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { AuthService, createRequestId } from "./auth.service";
import { mfaChallengeCookieName, readSessionCookie, sessionCookieName } from "./session-cookie";
export { readSessionCookie, sessionCookieName } from "./session-cookie";
import { CsrfOriginGuard } from "./csrf-origin.guard";
import { AuthEnvironment, AUTH_ENVIRONMENT } from "./auth.types";
import { RequirePermission } from "../authorization/require-permission.decorator";
import { Permission } from "../authorization/permissions";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { PermissionsGuard } from "../authorization/permissions.guard";
import { SessionAuthGuard } from "./session-auth.guard";
import { PasswordRecoveryService } from "./password-recovery.service";
import { ConfiguredPasswordResetDelivery } from "./password-reset-delivery";
import { MfaService } from "./mfa.service";

@Controller("api/auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
    private readonly passwordRecovery: PasswordRecoveryService,
    private readonly mfaService: MfaService,
    private readonly resetDelivery: ConfiguredPasswordResetDelivery,
  ) {}

  @Post("login")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard)
  async login(
    @Body() payload: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: { id: string; email: string; fullName: string }; expiresAt: string; mfaRequired?: false } | { mfaRequired: true }> {
    response.setHeader("Cache-Control", "no-store");
    const result = await this.authService.login(
      payload,
      request.ip ?? "unknown",
      createRequestId(request.header("x-request-id")),
    );
    if ("mfaRequired" in result) {
      response.clearCookie(sessionCookieName(this.environment), { httpOnly: true, secure: this.environment.nodeEnv === "production", sameSite: "lax", path: "/" });
      response.cookie(mfaChallengeCookieName(this.environment), result.rawChallengeToken, {
        httpOnly: true, secure: this.environment.nodeEnv === "production", sameSite: "lax", path: "/", expires: result.expiresAt,
      });
      return { mfaRequired: true };
    }
    response.cookie(sessionCookieName(this.environment), result.rawSessionToken, {
      httpOnly: true,
      secure: this.environment.nodeEnv === "production",
      sameSite: "lax",
      path: "/",
      expires: result.expiresAt,
    });
    return { user: result.user, expiresAt: result.expiresAt.toISOString(), mfaRequired: false };
  }

  @Post("password-reset/request")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard)
  async requestPasswordReset(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.passwordRecovery.request(body, request.ip ?? "unknown", createRequestId(request.header("x-request-id")));
  }

  @Post("password-reset/complete")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard)
  async completePasswordReset(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    const result = await this.passwordRecovery.complete(body, request.ip ?? "unknown", createRequestId(request.header("x-request-id")));
    response.clearCookie(sessionCookieName(this.environment), { httpOnly: true, secure: this.environment.nodeEnv === "production", sameSite: "lax", path: "/" });
    response.clearCookie(mfaChallengeCookieName(this.environment), { httpOnly: true, secure: this.environment.nodeEnv === "production", sameSite: "lax", path: "/" });
    return result;
  }

  /** Local-only delivery inspection for browser QA. Disabled unless explicitly enabled in development. */
  @Post("dev/password-reset-sink/read")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard)
  async readLocalPasswordResetSink(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    if (this.environment.nodeEnv !== "development" || !this.environment.localPasswordResetSinkEnabled || !this.environment.localPasswordResetSinkKey) {
      throw new NotFoundException();
    }
    const remoteAddress = request.socket.remoteAddress?.toLowerCase().replace(/^::ffff:/, "");
    if (remoteAddress !== "127.0.0.1" && remoteAddress !== "::1") {
      throw new NotFoundException();
    }
    const authorization = request.header("authorization") ?? "";
    const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const expectedBytes = Buffer.from(this.environment.localPasswordResetSinkKey);
    const suppliedBytes = Buffer.from(supplied);
    if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
      throw new NotFoundException();
    }
    return { messages: this.resetDelivery.drainCaptured() };
  }

  @Post("mfa/challenge")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard)
  async verifyMfaChallenge(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    const result = await this.mfaService.challenge(readSessionCookie(request, mfaChallengeCookieName(this.environment)), body, createRequestId(request.header("x-request-id")));
    response.clearCookie(mfaChallengeCookieName(this.environment), { httpOnly: true, secure: this.environment.nodeEnv === "production", sameSite: "lax", path: "/" });
    response.cookie(sessionCookieName(this.environment), result.rawSessionToken, { httpOnly: true, secure: this.environment.nodeEnv === "production", sameSite: "lax", path: "/", expires: result.expiresAt });
    return { user: result.user, expiresAt: result.expiresAt.toISOString(), mfaRequired: false };
  }

  @Get("mfa/status")
  @UseGuards(SessionAuthGuard)
  async mfaStatus(@Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.mfaService.status(request);
  }

  @Post("mfa/enrollment")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard, SessionAuthGuard)
  async beginMfaEnrollment(@Body() body: unknown, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.mfaService.beginEnrollment(request, body, createRequestId(request.header("x-request-id")));
  }

  @Post("mfa/enrollment/confirm")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard, SessionAuthGuard)
  async confirmMfaEnrollment(@Body() body: unknown, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.mfaService.confirmEnrollment(request, body, createRequestId(request.header("x-request-id")));
  }

  @Post("mfa/disable")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard, SessionAuthGuard)
  async disableMfa(@Body() body: unknown, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.mfaService.disable(request, body, createRequestId(request.header("x-request-id")));
  }

  @Post("mfa/recovery-codes/regenerate")
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard, SessionAuthGuard)
  async regenerateMfaRecoveryCodes(@Body() body: unknown, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.mfaService.regenerateRecoveryCodes(request, body, createRequestId(request.header("x-request-id")));
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
  ): Promise<{ user: { id: string; email: string; fullName: string }; platformRoles: readonly string[] }> {
    response.setHeader("Cache-Control", "no-store");
    return { user: request.authorizationContext!.user, platformRoles: request.authorizationContext!.platformRoles };
  }

}

