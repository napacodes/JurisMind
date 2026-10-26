import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Put, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { createRequestId } from "../auth/auth.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { Permission } from "../authorization/permissions";
import { PermissionsGuard } from "../authorization/permissions.guard";
import { RequirePermission, RequireWorkspacePermission } from "../authorization/require-permission.decorator";
import { MAX_CREDENTIAL_DOCUMENT_BYTES, validateCredentialFile } from "../lawyer-verification/credential-document";
import type { UploadedCredential } from "../lawyer-verification/credential-document";
import { parseUuid } from "../lawyer-verification/lawyer-verification.dto";
import { FirmVerificationService } from "./firm-verification.service";
import { parseFirmReviewInput, parseFirmVerificationDraft, parseFirmVerificationInput } from "./firm-verification.dto";

type FirmFiles = { registrationDocument?: UploadedCredential[]; authorityDocument?: UploadedCredential[] };

@Controller("api/workspaces/:workspaceId/firm-verification")
@UseGuards(SessionAuthGuard)
export class FirmVerificationController {
  constructor(@Inject(FirmVerificationService) private readonly verification: FirmVerificationService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequireWorkspacePermission(Permission.SubmitFirmVerification)
  mine(@Param("workspaceId") workspaceId: string, @Req() request: AuthorizationRequest,
    @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.verification.mine(parseUuid(workspaceId), request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Get("policy")
  @UseGuards(PermissionsGuard)
  @RequireWorkspacePermission(Permission.SubmitFirmVerification)
  documentPolicy(@Param("workspaceId") workspaceId: string, @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    const query = request.query as Record<string, unknown>;
    if (Object.keys(query).some((key) => !["jurisdiction", "legalForm"].includes(key))
      || (query.jurisdiction !== undefined && typeof query.jurisdiction !== "string")
      || (query.legalForm !== undefined && typeof query.legalForm !== "string")
      || (typeof query.jurisdiction === "string" && query.jurisdiction.length > 120)
      || (typeof query.legalForm === "string" && query.legalForm.length > 120)) throw new BadRequestException("Invalid document policy query.");
    response.setHeader("Cache-Control", "no-store");
    return this.verification.documentPolicy(parseUuid(workspaceId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, String(query.jurisdiction ?? ""), String(query.legalForm ?? ""));
  }

  @Post()
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermission(Permission.SubmitFirmVerification)
  @UseInterceptors(FileFieldsInterceptor([
    { name: "registrationDocument", maxCount: 1 }, { name: "authorityDocument", maxCount: 1 },
  ], { limits: { fileSize: MAX_CREDENTIAL_DOCUMENT_BYTES, files: 2, fields: 8, fieldSize: 4096, parts: 10 } }))
  submit(@Param("workspaceId") workspaceId: string, @Body() body: unknown, @UploadedFiles() files: FirmFiles | undefined,
    @Req() request: AuthorizationRequest, @Headers("x-request-id") requestId?: string,
    @Res({ passthrough: true }) response?: Response) {
    response?.setHeader("Cache-Control", "no-store");
    const registration = files?.registrationDocument?.[0];
    const authority = files?.authorityDocument?.[0];
    const parsedInput = parseFirmVerificationInput(body);
    return this.verification.submit(parseUuid(workspaceId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, createRequestId(requestId), parsedInput, [
        ...(registration ? [{ type: "REGISTRATION" as const, file: validateCredentialFile(registration), bytes: registration.buffer }] : []),
        ...(authority ? [{ type: "AUTHORITY" as const, file: validateCredentialFile(authority), bytes: authority.buffer }] : []),
      ]);
  }

  @Put("draft")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermission(Permission.SubmitFirmVerification)
  saveDraft(@Param("workspaceId") workspaceId: string, @Body() body: unknown, @Req() request: AuthorizationRequest,
    @Headers("x-request-id") requestId?: string, @Res({ passthrough: true }) response?: Response) {
    response?.setHeader("Cache-Control", "no-store");
    return this.verification.saveDraft(parseUuid(workspaceId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, createRequestId(requestId), parseFirmVerificationDraft(body));
  }

  @Get(":submissionId/documents/:documentId")
  async document(@Param("workspaceId") workspaceId: string, @Param("submissionId") submissionId: string,
    @Param("documentId") documentId: string, @Req() request: AuthorizationRequest, @Res() response: Response) {
    const result = await this.verification.ownerDocument(parseUuid(workspaceId), parseUuid(submissionId), parseUuid(documentId),
      request.authorizationContext!.user.id, request.authenticatedSessionId!);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    response.type(result.mediaType).send(result.bytes);
  }
}

@Controller("api/platform-admin/firm-verifications")
@UseGuards(SessionAuthGuard, PermissionsGuard)
@RequirePermission(Permission.PlatformAdministration)
export class PlatformFirmVerificationController {
  constructor(@Inject(FirmVerificationService) private readonly verification: FirmVerificationService) {}

  @Get()
  list(@Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response) {
    const query = request.query as Record<string, unknown>;
    if (Object.keys(query).some((key) => !["status", "page", "pageSize"].includes(key))) throw new BadRequestException("Invalid verification query.");
    const status = query.status === undefined || query.status === "PENDING" ? "PENDING" : query.status === "ALL" ? "ALL" : null;
    if (!status) throw new BadRequestException("Invalid verification status filter.");
    const page = parsePositiveInt(query.page, 1, 10_000);
    const pageSize = parsePositiveInt(query.pageSize, 25, 100);
    response.setHeader("Cache-Control", "no-store");
    return this.verification.listForReview(request.authorizationContext!.user.id, request.authenticatedSessionId!, status, page, pageSize);
  }

  @Get(":submissionId")
  detail(@Param("submissionId") submissionId: string, @Req() request: AuthorizationRequest,
    @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.verification.adminDetail(parseUuid(submissionId), request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Get(":submissionId/documents/:documentId")
  async adminDocument(@Param("submissionId") submissionId: string, @Param("documentId") documentId: string,
    @Req() request: AuthorizationRequest, @Res() response: Response) {
    const result = await this.verification.adminDocument(parseUuid(submissionId), parseUuid(documentId),
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
    const input = parseFirmReviewInput(body);
    return this.verification.review(parseUuid(submissionId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, createRequestId(requestId), input.decision, input.reason);
  }
}

function parsePositiveInt(value: unknown, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d{0,4}$/.test(value)) throw new BadRequestException("Invalid verification query.");
  const parsed = Number(value);
  if (parsed > maximum) throw new BadRequestException("Invalid verification query.");
  return parsed;
}
