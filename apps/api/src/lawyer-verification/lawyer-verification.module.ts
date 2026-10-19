import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { LawyerVerificationController } from "./lawyer-verification.controller";
import { PlatformLawyerVerificationController } from "./platform-lawyer-verification.controller";
import { LawyerVerificationService } from "./lawyer-verification.service";
import { PrivateDocumentStorage } from "./private-document-storage";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [LawyerVerificationController, PlatformLawyerVerificationController],
  providers: [LawyerVerificationService, PrivateDocumentStorage],
})
export class LawyerVerificationModule {}
