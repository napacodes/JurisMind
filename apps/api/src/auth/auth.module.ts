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
import { MfaCryptoService } from "./mfa-crypto.service";
import { MfaService } from "./mfa.service";
import { PasswordRecoveryService } from "./password-recovery.service";
import { ConfiguredPasswordResetDelivery, PASSWORD_RESET_DELIVERY } from "./password-reset-delivery";

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
    MfaCryptoService,
    MfaService,
    PasswordRecoveryService,
    ConfiguredPasswordResetDelivery,
    { provide: PASSWORD_RESET_DELIVERY, useExisting: ConfiguredPasswordResetDelivery },
  ],
  exports: [SessionAuthGuard, CsrfOriginGuard, AuthService, PasswordHasherService, AUTH_ENVIRONMENT],
})
export class AuthModule {}
