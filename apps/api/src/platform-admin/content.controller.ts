import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { createRequestId } from "../auth/auth.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { Permission } from "../authorization/permissions";
import { PermissionsGuard } from "../authorization/permissions.guard";
import { RequirePermission } from "../authorization/require-permission.decorator";
import { ContentService } from "./content.service";
import { parseContentId, parseContentInput, parseContentUpdate, parsePublicSlug } from "./content.dto";

@Controller("api/platform-admin/content")
@UseGuards(SessionAuthGuard, PermissionsGuard)
@RequirePermission(Permission.PlatformAdministration)
export class PlatformContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Get()
  list(@Query() query: Record<string, unknown>, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    if (Object.keys(query).some((key) => key !== "page" && key !== "pageSize")) throw new BadRequestException("Invalid pagination.");
    const page = positive(query.page, 1, 10_000); const pageSize = positive(query.pageSize, 25, 100);
    response.setHeader("Cache-Control", "no-store");
    return this.content.list(request.authorizationContext!.user.id, request.authenticatedSessionId!, page, pageSize);
  }

  @Post()
  @UseGuards(CsrfOriginGuard)
  create(@Body() body: unknown, @Req() request: AuthorizationRequest, @Headers("x-request-id") requestId?: string,
    @Res({ passthrough: true }) response?: Response) {
    response?.setHeader("Cache-Control", "no-store");
    return this.content.create(parseContentInput(body), request.authorizationContext!.user.id, request.authenticatedSessionId!, createRequestId(requestId));
  }

  @Get(":id/preview")
  preview(@Param("id") id: string, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.content.preview(parseContentId(id), request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Patch(":id")
  @UseGuards(CsrfOriginGuard)
  update(@Param("id") id: string, @Body() body: unknown, @Req() request: AuthorizationRequest,
    @Headers("x-request-id") requestId?: string, @Res({ passthrough: true }) response?: Response) {
    response?.setHeader("Cache-Control", "no-store");
    const update = parseContentUpdate(body);
    return this.content.update(parseContentId(id), update.input, update.expectedUpdatedAt, request.authorizationContext!.user.id,
      request.authenticatedSessionId!, createRequestId(requestId));
  }

  @Post(":id/:action")
  @UseGuards(CsrfOriginGuard)
  transition(@Param("id") id: string, @Param("action") action: string, @Req() request: AuthorizationRequest,
    @Headers("x-request-id") requestId?: string, @Res({ passthrough: true }) response?: Response) {
    if (action !== "publish" && action !== "unpublish" && action !== "archive") throw new BadRequestException("Invalid content action.");
    response?.setHeader("Cache-Control", "no-store");
    return this.content.transition(parseContentId(id), action, request.authorizationContext!.user.id,
      request.authenticatedSessionId!, createRequestId(requestId));
  }
}

@Controller("api/public/content")
export class PublicContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Get(":slug")
  async get(@Param("slug") slug: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.content.publicBySlug(parsePublicSlug(slug));
  }
}

function positive(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d{0,4}$/.test(value) || Number(value) > max) throw new BadRequestException("Invalid pagination.");
  return Number(value);
}
