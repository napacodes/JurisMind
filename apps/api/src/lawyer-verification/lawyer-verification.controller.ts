import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Put, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CsrfOriginGuard } from "../auth/csrf-origin.guard";
import { createRequestId } from "../auth/auth.service";
import type { AuthorizationRequest } from "../authorization/authorization.types";
import { PermissionsGuard } from "../authorization/permissions.guard";
import { Permission } from "../authorization/permissions";
import { RequireWorkspacePermission } from "../authorization/require-permission.decorator";
import { CredentialSubmissionInput, parseCredentialDraft, parseSubmissionInput, parseUuid } from "./lawyer-verification.dto";
import { MAX_CREDENTIAL_DOCUMENT_BYTES, UploadedCredential, validateCredentialFile } from "./credential-document";
import { LawyerVerificationService } from "./lawyer-verification.service";

@Controller("api/workspaces/:workspaceId/lawyer-verification")
@UseGuards(SessionAuthGuard)
export class LawyerVerificationController {
  constructor(@Inject(LawyerVerificationService) private readonly verifications: LawyerVerificationService) {}

  @Get()
  mine(@Param("workspaceId") workspaceId: string, @Req() request: AuthorizationRequest,
    @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "no-store");
    return this.verifications.mine(parseUuid(workspaceId), request.authorizationContext!.user.id, request.authenticatedSessionId!);
  }

  @Get("policy")
  @UseGuards(PermissionsGuard)
  @RequireWorkspacePermission(Permission.SubmitLawyerCredentialVerification)
  documentPolicy(@Param("workspaceId") workspaceId: string, @Req() request: AuthorizationRequest,
    @Res({ passthrough: true }) response: Response) {
    const query = request.query as Record<string, unknown>;
    if (Object.keys(query).some((key) => key !== "jurisdiction")
      || (query.jurisdiction !== undefined && typeof query.jurisdiction !== "string")
      || (typeof query.jurisdiction === "string" && query.jurisdiction.length > 120)) throw new BadRequestException("Invalid document policy query.");
    response.setHeader("Cache-Control", "no-store");
    return this.verifications.documentPolicy(parseUuid(workspaceId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, String(query.jurisdiction ?? ""));
  }

  @Post()
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermission(Permission.SubmitLawyerCredentialVerification)
  @UseInterceptors(FileInterceptor("document", { limits: { fileSize: MAX_CREDENTIAL_DOCUMENT_BYTES, files: 1, fields: 4, fieldSize: 2048, parts: 5 } }))
  submit(@Param("workspaceId") workspaceId: string, @Body() body: unknown, @UploadedFile() file: UploadedCredential | undefined,
    @Req() request: AuthorizationRequest, @Res({ passthrough: true }) response: Response,
    @Headers("x-request-id") requestId?: string) {
    response.setHeader("Cache-Control", "no-store");
    const validFile = file ? validateCredentialFile(file) : undefined;
    const input: CredentialSubmissionInput = parseSubmissionInput(body);
    return this.verifications.submit(parseUuid(workspaceId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, createRequestId(requestId), input, validFile, file?.buffer);
  }

  @Put("draft")
  @UseGuards(CsrfOriginGuard, PermissionsGuard)
  @RequireWorkspacePermission(Permission.SubmitLawyerCredentialVerification)
  saveDraft(@Param("workspaceId") workspaceId: string, @Body() body: unknown, @Req() request: AuthorizationRequest,
    @Res({ passthrough: true }) response: Response, @Headers("x-request-id") requestId?: string) {
    response.setHeader("Cache-Control", "no-store");
    return this.verifications.saveDraft(parseUuid(workspaceId), request.authorizationContext!.user.id,
      request.authenticatedSessionId!, createRequestId(requestId), parseCredentialDraft(body));
  }

  @Get(":submissionId/documents/:documentId")
  async document(@Param("workspaceId") workspaceId: string, @Param("submissionId") submissionId: string,
    @Param("documentId") documentId: string, @Req() request: AuthorizationRequest, @Res() response: Response) {
    const result = await this.verifications.ownerDocument(parseUuid(workspaceId), parseUuid(submissionId), parseUuid(documentId),
      request.authorizationContext!.user.id, request.authenticatedSessionId!);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    response.type(result.mediaType).send(result.bytes);
  }
}
