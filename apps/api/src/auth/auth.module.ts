import { Module } from "@nestjs/common";
import { AuthorizationModule } from "../authorization/authorization.module";
import { validateEnvironment } from "../config/env.validation";
import { PrismaModule } from "../database/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AUTH_ENVIRONMENT } from "./auth.types";
import { CsrfOriginGuard } from "./csrf-origin.guard";
import { LoginRateLimiterService } from "./login-rate-limiter.service";
import { PasswordHasherService } from "./password-hasher.service";
import { SessionAuthGuard } from "./session-auth.guard";

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [AuthController],
  providers: [
    { provide: AUTH_ENVIRONMENT, useFactory: () => validateEnvironment(process.env) },
    AuthService,
    PasswordHasherService,
    LoginRateLimiterService,
    CsrfOriginGuard,
    SessionAuthGuard,
  ],
  exports: [SessionAuthGuard, CsrfOriginGuard, AuthService, AUTH_ENVIRONMENT],
})
export class AuthModule {}
