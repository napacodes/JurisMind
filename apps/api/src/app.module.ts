import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./database/prisma.module";
import { MembershipsModule } from "./memberships/memberships.module";
import { IndividualPracticeModule } from "./workspaces/individual-practice.module";

@Module({
  imports: [PrismaModule, AuthModule, MembershipsModule, IndividualPracticeModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
