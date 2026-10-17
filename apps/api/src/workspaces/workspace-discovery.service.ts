import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { permissionsForPracticeRole } from "../authorization/permissions";
import { PrismaService } from "../database/prisma.service";
import { Prisma } from "../generated/prisma/client";

@Injectable()
export class WorkspaceDiscoveryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listMine(actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sessions = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT s.id FROM user_sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = ${sessionId}::uuid AND s.user_id = ${actorId}::uuid
          AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'ACTIVE'
        FOR SHARE OF s, u
      `;
      if (sessions.length !== 1) throw new UnauthorizedException("Authentication required.");
      const memberships = await tx.practiceMembership.findMany({
        where: { userId: actorId, status: "ACTIVE", workspace: { is: { status: "ACTIVE" } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, role: true, workspace: { select: { id: true, name: true, slug: true, kind: true } } },
      });
      return memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        kind: membership.workspace.kind,
        membershipId: membership.id,
        role: membership.role,
        permissions: permissionsForPracticeRole(membership.role, membership.workspace.kind),
      }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }
}
