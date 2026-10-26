import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { PrivateDocumentStorage } from "../lawyer-verification/private-document-storage";
import { FirmVerificationController, PlatformFirmVerificationController } from "./firm-verification.controller";
import { FirmVerificationService } from "./firm-verification.service";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [FirmVerificationController, PlatformFirmVerificationController],
  providers: [FirmVerificationService, PrivateDocumentStorage],
})
export class FirmVerificationModule {}
