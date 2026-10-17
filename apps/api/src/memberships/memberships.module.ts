import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { AuthorizationModule } from "../authorization/authorization.module";
import { MembershipsController } from "./memberships.controller";
import { MembershipsService } from "./memberships.service";
import { InvitationsService } from "./invitations.service";
import { InvitationsController } from "./invitations.controller";
import { INVITATION_DELIVERY, UnconfiguredInvitationDelivery } from "./invitation-delivery";

@Module({ imports: [AuthModule, AuthorizationModule], controllers: [MembershipsController, InvitationsController],
  providers: [MembershipsService, InvitationsService, SessionAuthGuard, CsrfOriginGuard,
    { provide: INVITATION_DELIVERY, useClass: UnconfiguredInvitationDelivery }] })
export class MembershipsModule {}
