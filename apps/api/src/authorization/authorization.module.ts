import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module";
import { AuthorizationContextService } from "./authorization-context.service";
import { AuthorizationService } from "./authorization.service";
import { PermissionsGuard } from "./permissions.guard";

@Module({
  imports: [PrismaModule],
  providers: [AuthorizationContextService, AuthorizationService, PermissionsGuard],
  exports: [AuthorizationContextService, AuthorizationService, PermissionsGuard],
})
export class AuthorizationModule {}
