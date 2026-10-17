import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { IndividualPracticeController } from "./individual-practice.controller";
import { IndividualPracticeService } from "./individual-practice.service";
import { WorkspaceDiscoveryService } from "./workspace-discovery.service";

@Module({ imports: [AuthModule, AuthorizationModule], controllers: [IndividualPracticeController],
  providers: [IndividualPracticeService, WorkspaceDiscoveryService, SessionAuthGuard, CsrfOriginGuard] })
export class IndividualPracticeModule {}
