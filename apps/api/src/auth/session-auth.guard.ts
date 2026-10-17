import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthorizationContextService } from "../authorization/authorization-context.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { AuthService } from "./auth.service";
import { readSessionCookie, sessionCookieName } from "./session-cookie";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "./auth.types";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AuthorizationContextService) private readonly authorizationContextService: AuthorizationContextService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment,
  ) {}

  async canActivate(execution: ExecutionContext): Promise<boolean> {
    const request = execution.switchToHttp().getRequest<Request>();
    const response = execution.switchToHttp().getResponse<Response>();
    const cookieName = sessionCookieName(this.environment);
    const token = readSessionCookie(request, cookieName);
    const authenticatedSession = await this.authService.currentSession(token);
    const authorizationContext = authenticatedSession
      ? await this.authorizationContextService.resolveForUser(authenticatedSession.user.id)
      : null;

    if (!authorizationContext || !authenticatedSession) {
      response.clearCookie(cookieName, {
        httpOnly: true,
        secure: this.environment.nodeEnv === "production",
        sameSite: "lax",
        path: "/",
      });
      throw new UnauthorizedException("Authentication required.");
    }

    (request as AuthorizationRequest).authorizationContext = authorizationContext;
    (request as AuthorizationRequest).authenticatedSessionId = authenticatedSession.sessionId;
    return true;
  }
}
