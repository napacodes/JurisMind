import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { PrismaClient } from "../generated/prisma/client";
import type { AuthorizationContext } from "./authorization.types";

@Injectable()
export class AuthorizationContextService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolveForUser(userId: string, client: Pick<PrismaClient, "user"> = this.prisma): Promise<AuthorizationContext | null> {
    const user = await client.user.findFirst({
      where: { id: userId, status: "ACTIVE" },
      select: {
        id: true,
        email: true,
        fullName: true,
        memberships: {
          where: { status: "ACTIVE", workspace: { is: { status: "ACTIVE" } } },
          select: {
            workspaceId: true,
            role: true,
            workspace: { select: { name: true, slug: true, kind: true } },
          },
        },
        platformRoleGrants: {
          where: { revokedAt: null },
          select: { role: true },
        },
      },
    });

    if (!user) return null;
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName },
      platformRoles: user.platformRoleGrants.map((grant) => grant.role),
      memberships: user.memberships.map((membership) => ({
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        workspaceSlug: membership.workspace.slug,
        workspaceKind: membership.workspace.kind,
        role: membership.role,
      })),
    };
  }
}
