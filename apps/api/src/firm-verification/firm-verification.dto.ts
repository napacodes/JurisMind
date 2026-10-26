import { BadRequestException } from "@nestjs/common";

export type FirmVerificationInput = {
  legalName: string;
  registrationNumber: string;
  jurisdiction: string;
  legalForm: string;
  registeredAddress: string;
  representativeName: string;
  representativeTitle: string;
  authorityDescription: string;
};

export function parseFirmVerificationInput(raw: unknown): FirmVerificationInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid firm verification details.");
  const body = raw as Record<string, unknown>;
  const allowed = new Set(["legalName", "registrationNumber", "jurisdiction", "legalForm", "registeredAddress",
    "representativeName", "representativeTitle", "authorityDescription"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new BadRequestException("Invalid firm verification details.");
  return {
    legalName: normalized(body.legalName, 1, 200),
    registrationNumber: normalized(body.registrationNumber, 1, 160),
    jurisdiction: normalized(body.jurisdiction, 1, 120),
    legalForm: normalized(body.legalForm, 1, 120),
    registeredAddress: normalized(body.registeredAddress, 1, 500),
    representativeName: normalized(body.representativeName, 1, 200),
    representativeTitle: normalized(body.representativeTitle, 1, 120),
    authorityDescription: normalized(body.authorityDescription, 1, 1000),
  };
}

export function parseFirmVerificationDraft(raw: unknown): Partial<FirmVerificationInput> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid firm verification draft.");
  const body = raw as Record<string, unknown>;
  const allowed = new Set<keyof FirmVerificationInput>(["legalName", "registrationNumber", "jurisdiction", "legalForm",
    "registeredAddress", "representativeName", "representativeTitle", "authorityDescription"]);
  if (Object.keys(body).some((key) => !allowed.has(key as keyof FirmVerificationInput))) throw new BadRequestException("Invalid firm verification draft.");
  const draft: Partial<FirmVerificationInput> = {
    legalName: "", registrationNumber: "", jurisdiction: "", legalForm: "", registeredAddress: "",
    representativeName: "", representativeTitle: "", authorityDescription: "",
  };
  for (const key of allowed) {
    if (body[key] !== undefined) {
      const max = key === "registeredAddress" ? 500 : key === "authorityDescription" ? 1000 : key === "registrationNumber" ? 160 : key === "jurisdiction" || key === "legalForm" || key === "representativeTitle" ? 120 : 200;
      draft[key] = normalized(body[key], 0, max, true);
    }
  }
  return draft;
}

export type FirmReviewDecision = "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";

export function parseFirmReviewInput(raw: unknown): { decision: FirmReviewDecision; reason: string | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid review decision.");
  const body = raw as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "decision" && key !== "reason")) throw new BadRequestException("Invalid review decision.");
  if (body.decision !== "APPROVED" && body.decision !== "CHANGES_REQUESTED" && body.decision !== "REJECTED") {
    throw new BadRequestException("Invalid review decision.");
  }
  const reason = body.reason === undefined ? "" : typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length > 1000 || (body.decision !== "APPROVED" && !reason)) {
    throw new BadRequestException("A reason is required for this review decision.");
  }
  return { decision: body.decision, reason: body.decision === "APPROVED" ? null : reason };
}

function normalized(value: unknown, min: number, max: number, allowEmpty = false): string {
  if (typeof value !== "string") throw new BadRequestException("Invalid firm verification details.");
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new BadRequestException("Invalid firm verification details.");
  const result = value.trim().replace(/\s+/g, " ");
  if ((!allowEmpty && result.length < min) || result.length > max || /[\u0000-\u001f\u007f]/.test(result)) {
    throw new BadRequestException("Invalid firm verification details.");
  }
  return result;
}
