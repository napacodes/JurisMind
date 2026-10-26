import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./database/prisma.module";
import { MembershipsModule } from "./memberships/memberships.module";
import { IndividualPracticeModule } from "./workspaces/individual-practice.module";
import { PlatformAdminModule } from "./platform-admin/platform-admin.module";
import { LawyerVerificationModule } from "./lawyer-verification/lawyer-verification.module";
import { FirmVerificationModule } from "./firm-verification/firm-verification.module";

@Module({
  imports: [PrismaModule, AuthModule, MembershipsModule, IndividualPracticeModule, PlatformAdminModule, LawyerVerificationModule, FirmVerificationModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
