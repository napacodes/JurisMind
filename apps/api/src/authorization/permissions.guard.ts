import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../database/prisma.service";
import { createRequestId } from "../auth/auth.service";
import { AuthorizationService } from "./authorization.service";
import { REQUIRED_PERMISSION_METADATA } from "./require-permission.decorator";
import type { AuthorizationRequest, RequiredPermission } from "./authorization.types";

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthorizationRequest>();
    const requirement = this.reflector.getAllAndOverride<RequiredPermission>(
      REQUIRED_PERMISSION_METADATA,
      [context.getHandler(), context.getClass()],
    );

    // A route protected by this guard must explicitly declare its policy.
    if (!requirement) throw new ForbiddenException("No authorization policy is configured.");
    if (!request.authorizationContext) throw new UnauthorizedException("Authentication required.");

    const rawWorkspaceId = requirement.workspaceIdParam
      ? request.params[requirement.workspaceIdParam]
      : undefined;
    const workspaceId = typeof rawWorkspaceId === "string" ? rawWorkspaceId : undefined;
    if (requirement.workspaceIdParam && !workspaceId) {
      throw new ForbiddenException("Workspace access is not allowed.");
    }
    const permissions = requirement.anyOf ?? (requirement.permission ? [requirement.permission] : []);
    if (!permissions.some((permission) => this.authorizationService.hasPermission(
      request.authorizationContext!, permission, workspaceId,
    ))) {
      await this.recordDenial(request, request.authorizationContext.user.id, permissions.join("|"));
      throw new ForbiddenException("Permission denied.");
    }
    return true;
  }

  private async recordDenial(request: AuthorizationRequest, actorUserId: string, permission: string): Promise<void> {
    try {
      await this.prisma.securityAuditEvent.create({
        data: {
          actorUserId,
          eventType: "AUTHZ_DENIED",
          targetType: "Permission",
          targetId: permission.slice(0, 200),
          requestId: createRequestId(request.header("x-request-id")),
        },
      });
    } catch {
      // A telemetry failure must not turn a denied request into an allow.
      this.logger.warn("Could not persist an authorization-denial audit event.");
    }
  }
}
