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

    const audience = authenticatedSession.audience;
    const scopedContext = audience === "ADMINISTRATION"
      ? { ...authorizationContext, memberships: [] }
      : {
        ...authorizationContext,
        platformRoles: [],
        memberships: authorizationContext.memberships.filter((membership) =>
        audience === "FIRM" ? membership.role === "FIRM_ADMIN" && membership.workspaceKind === "FIRM"
          : audience === "LAWYER" ? membership.role === "LAWYER"
            : membership.role === "ASSISTANT",
        ),
      };

    (request as AuthorizationRequest).authorizationContext = scopedContext;
    (request as AuthorizationRequest).authenticatedAudience = audience;
    (request as AuthorizationRequest).authenticatedSessionId = authenticatedSession.sessionId;
    return true;
  }
}
