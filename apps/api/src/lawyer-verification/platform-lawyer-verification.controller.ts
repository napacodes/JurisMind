import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { createRequestId } from "../auth/auth.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { Permission } from "../authorization/permissions";
import { PermissionsGuard } from "../authorization/permissions.guard";
import { RequirePermission } from "../authorization/require-permission.decorator";
import { parseReviewInput, parseUuid } from "./lawyer-verification.dto";
import { LawyerVerificationService } from "./lawyer-verification.service";

@Controller("api/platform-admin/lawyer-verifications")
@UseGuards(SessionAuthGuard, PermissionsGuard)
@RequirePermission(Permission.PlatformAdministration)
export class PlatformLawyerVerificationController {
  constructor(@Inject(LawyerVerificationService) private readonly verifications: LawyerVerificationService) {}

  @Get()
  pending(@Query() query: Record<string, unknown>, @Req() request: AuthorizationRequest,
    @Res({ passthrough: true }) response: Response) {
    if (Object.keys(query).some((key) => key !== "page" && key !== "pageSize" && key !== "status")) throw new BadRequestException("Invalid pagination.");
    const status = query.status === undefined || query.status === "PENDING" ? "PENDING" : query.status === "ALL" ? "ALL" : null;
    if (!status) throw new BadRequestException("Invalid credential status filter.");
    const page = parsePositiveInt(query.page, 1, 10_000);
    const pageSize = parsePositiveInt(query.pageSize, 25, 100);
    response.setHeader("Cache-Control", "no-store");
    return this.verifications.pending(request.authorizationContext!.user.id, request.authenticatedSessionId!, page, pageSize, status);
  }

  @Get(":submissionId")
  detail(@Param("submissionId") submissionId: string, @Req() request: AuthorizationRequest,
    @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.verifications.adminDetail(parseUuid(submissionId), request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Get(":submissionId/documents/:documentId")
  async document(@Param("submissionId") submissionId: string, @Param("documentId") documentId: string,
    @Req() request: AuthorizationRequest, @Res() response: Response) {
    const result = await this.verifications.adminDocument(parseUuid(submissionId), parseUuid(documentId),
      request.authorizationContext!.user.id, request.authenticatedSessionId!);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    response.type(result.mediaType).send(result.bytes);
  }

  @Post(":submissionId/review")
  @UseGuards(CsrfOriginGuard)
  review(@Param("submissionId") submissionId: string, @Body() body: unknown, @Req() request: AuthorizationRequest,
    @Headers("x-request-id") requestId?: string, @Res({ passthrough: true }) response?: Response) {
    response?.setHeader("Cache-Control", "no-store");
    const input = parseReviewInput(body);
    return this.verifications.review(parseUuid(submissionId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, createRequestId(requestId), input.decision, input.reason);
  }
}

function parsePositiveInt(value: unknown, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d{0,4}$/.test(value)) throw new BadRequestException("Invalid pagination.");
  const parsed = Number(value);
  if (parsed > maximum) throw new BadRequestException("Invalid pagination.");
  return parsed;
}
