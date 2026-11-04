import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { PrismaModule } from "../database/prisma.module";
import { PlatformUsersController } from "./platform-users.controller";
import { PlatformUsersService } from "./platform-users.service";
import { PlatformContentController, PublicContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { PrivateDocumentStorage } from "../lawyer-verification/private-document-storage";

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [PlatformUsersController, PlatformContentController, PublicContentController],
  providers: [PlatformUsersService, ContentService, PrivateDocumentStorage],
})
export class PlatformAdminModule {}
