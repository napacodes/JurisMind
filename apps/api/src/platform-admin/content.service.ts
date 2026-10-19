import {
  ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { ContentEntryStatus, ContentEntryType } from "../generated/prisma/enums";
import { createRequestId } from "../auth/auth.service";
import { AuthorizationContextService } from "../authorization/authorization-context.service";
import { AuthorizationService } from "../authorization/authorization.service";
import { Permission } from "../authorization/permissions";
import { PrismaService } from "../database/prisma.service";
import { ContentInput } from "./content.dto";

type Tx = Prisma.TransactionClient;
const contentSelect = { id: true, type: true, status: true, slug: true, title: true, summary: true, body: true,
  seoTitle: true, seoDescription: true, publishedAt: true, createdAt: true, updatedAt: true } as const;

@Injectable()
export class ContentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthorizationContextService) private readonly contexts: AuthorizationContextService,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService) {}

  async list(actorId: string, sessionId: string, page: number, pageSize: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireAdmin(tx, actorId, sessionId);
      const [total, entries] = await Promise.all([
        tx.contentEntry.count(),
        tx.contentEntry.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize,
          take: pageSize, select: { id: true, type: true, status: true, slug: true, title: true, summary: true,
            publishedAt: true, createdAt: true, updatedAt: true } }),
      ]);
      return { entries, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async create(input: ContentInput, actorId: string, sessionId: string, requestId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.requireAdmin(tx, actorId, sessionId);
        const entry = await tx.contentEntry.create({ data: { ...input, type: input.type as ContentEntryType,
          createdById: actorId, updatedById: actorId }, select: contentSelect });
        await this.audit(tx, actorId, requestId, "CONTENT_CREATED", entry.id, { type: entry.type, status: entry.status });
        return entry;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { throw uniqueConflict(error); }
  }

  async update(id: string, input: ContentInput, expectedUpdatedAt: Date, actorId: string, sessionId: string, requestId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.requireAdmin(tx, actorId, sessionId);
        await this.lockEntry(tx, id);
        const current = await tx.contentEntry.findUnique({ where: { id }, select: { status: true, updatedAt: true } });
        if (!current) throw new NotFoundException("Content not found.");
        if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new ConflictException("Content changed since it was opened. Refresh before saving.");
        if (current.status === ContentEntryStatus.ARCHIVED) throw new ConflictException("Archived content cannot be edited.");
        const entry = await tx.contentEntry.update({ where: { id }, data: { ...input, type: input.type as ContentEntryType, updatedById: actorId }, select: contentSelect });
        await this.audit(tx, actorId, requestId, "CONTENT_UPDATED", id, { status: entry.status });
        return entry;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { throw uniqueConflict(error); }
  }

  async transition(id: string, action: "publish" | "unpublish" | "archive", actorId: string, sessionId: string, requestId: string) {
    try { return await this.prisma.$transaction(async (tx) => {
      await this.requireAdmin(tx, actorId, sessionId);
      await this.lockEntry(tx, id);
      const entry = await tx.contentEntry.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!entry) throw new NotFoundException("Content not found.");
      const target = action === "publish" ? ContentEntryStatus.PUBLISHED
        : action === "archive" ? ContentEntryStatus.ARCHIVED : ContentEntryStatus.DRAFT;
      if (action === "publish" && entry.status !== ContentEntryStatus.DRAFT) throw new ConflictException("Only drafts can be published.");
      if (action === "unpublish" && entry.status !== ContentEntryStatus.PUBLISHED) throw new ConflictException("Only published content can be unpublished.");
      if (action === "archive" && entry.status === ContentEntryStatus.ARCHIVED) throw new ConflictException("Content is already archived.");
      const updated = await tx.contentEntry.update({ where: { id }, data: { status: target,
        publishedAt: action === "publish" ? new Date() : null, updatedById: actorId }, select: contentSelect });
      const eventType = action === "publish" ? "CONTENT_PUBLISHED" : action === "unpublish" ? "CONTENT_UNPUBLISHED" : "CONTENT_ARCHIVED";
      await this.audit(tx, actorId, requestId, eventType, id, { fromStatus: entry.status, toStatus: target });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new ConflictException("Content changed during this action. Refresh and try again.");
      }
      throw error;
    }
  }

  async preview(id: string, actorId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireAdmin(tx, actorId, sessionId);
      const entry = await tx.contentEntry.findUnique({ where: { id }, select: contentSelect });
      if (!entry) throw new NotFoundException("Content not found.");
      return entry;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async publicBySlug(slug: string) {
    const entry = await this.prisma.contentEntry.findFirst({ where: { slug, status: ContentEntryStatus.PUBLISHED }, select: contentSelect });
    if (!entry) throw new NotFoundException("Content not found.");
    return entry;
  }

  private async requireAdmin(tx: Tx, actorId: string, sessionId: string): Promise<void> {
    const sessions = await tx.$queryRaw<Array<{ id: string }>>`SELECT s.id FROM user_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id=${sessionId}::uuid AND s.user_id=${actorId}::uuid AND s.revoked_at IS NULL AND s.expires_at>NOW() AND u.status='ACTIVE' FOR SHARE OF s,u`;
    if (sessions.length !== 1) throw new UnauthorizedException("Authentication required.");
    const grants = await tx.$queryRaw<Array<{ user_id: string }>>`SELECT user_id FROM platform_role_grants
      WHERE user_id=${actorId}::uuid AND role='SUPER_ADMIN' AND revoked_at IS NULL FOR SHARE`;
    const context = await this.contexts.resolveForUser(actorId, tx);
    if (grants.length !== 1 || !context || !this.authorization.hasPermission(context, Permission.PlatformAdministration)) {
      throw new ForbiddenException("Permission denied.");
    }
  }

  private async lockEntry(tx: Tx, id: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM content_entries WHERE id=${id}::uuid FOR UPDATE`;
  }

  private async audit(tx: Tx, actorId: string, requestId: string, eventType: string, targetId: string, metadata: Prisma.InputJsonValue) {
    await tx.securityAuditEvent.create({ data: { actorUserId: actorId, eventType, targetType: "ContentEntry", targetId,
      requestId: createRequestId(requestId), metadata } });
  }
}

function uniqueConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("That content slug is already in use.");
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new ConflictException("Content changed during this action. Refresh and try again.");
  throw error;
}
