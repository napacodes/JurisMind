import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "./auth.types";

@Injectable()
export class CsrfOriginGuard implements CanActivate {
  constructor(@Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    this.assertTrustedOrigin(request.headers.origin);
    return true;
  }

  assertTrustedOrigin(origin: string | undefined): void {
    if (!origin || !this.environment.trustedOrigins.includes(origin)) {
      throw new ForbiddenException("Request origin is not allowed.");
    }
  }
}
