import { BadRequestException } from "@nestjs/common";
import { UserStatus } from "../generated/prisma/enums";

export type PracticeAccountType = "FIRM" | "LAWYER" | "ASSISTANT";
export type LawyerWorkspaceMode = "INDIVIDUAL" | "FIRM";
export type CreatePracticeUserInput = {
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  password: string;
  status: UserStatus;
  accountType: PracticeAccountType;
  firmName?: string;
  workspaceMode?: LawyerWorkspaceMode;
  workspaceId?: string;
  practiceName?: string;
  supervisorMembershipId?: string;
};

export type UploadedProfilePhoto = { buffer: Buffer; mimetype: string; size: number };
export type ValidProfilePhoto = { mediaType: "image/png" | "image/jpeg" | "image/gif"; extension: "png" | "jpg" | "gif" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/;
const COUNTRY_DIAL_CODES: Readonly<Record<string, string>> = {
  AE: "+971", AU: "+61", BE: "+32", BR: "+55", CA: "+1", CH: "+41", DE: "+49", DZ: "+213",
  DK: "+45", EG: "+20", ES: "+34", FR: "+33", GB: "+44", IN: "+91", IE: "+353", IT: "+39",
  MA: "+212", MX: "+52", NG: "+234", NL: "+31", NO: "+47", NZ: "+64", PK: "+92", PT: "+351",
  QA: "+974", SA: "+966", SE: "+46", TN: "+216", TR: "+90", US: "+1", ZA: "+27",
};

function text(body: Record<string, unknown>, field: string, maxLength: number): string {
  const value = body[field];
  if (typeof value !== "string") throw new BadRequestException(`Enter a valid ${field}.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new BadRequestException(`Enter a valid ${field}.`);
  }
  return normalized;
}

export function parseCreatePracticeUserInput(raw: unknown): CreatePracticeUserInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Invalid practice-account details.");
  const body = raw as Record<string, unknown>;
  const allowed = ["firstName", "lastName", "username", "email", "countryCode", "phoneNumber", "password", "status", "accountType",
    "firmName", "workspaceMode", "workspaceId", "practiceName", "supervisorMembershipId"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new BadRequestException("Invalid practice-account details.");

  const firstName = text(body, "firstName", 100);
  const lastName = text(body, "lastName", 100);
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName.length > 200) throw new BadRequestException("First and last name are too long.");
  const username = text(body, "username", 32).toLowerCase();
  if (!USERNAME_PATTERN.test(username)) throw new BadRequestException("Username must be 3–32 characters and use letters, numbers, dots, hyphens, or underscores.");
  const email = text(body, "email", 320).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new BadRequestException("Enter a valid email address.");
  const countryCode = text(body, "countryCode", 2).toUpperCase();
  const dialCode = COUNTRY_DIAL_CODES[countryCode];
  if (!dialCode) throw new BadRequestException("Choose a supported country.");
  const phoneNumber = text(body, "phoneNumber", 16);
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber) || !phoneNumber.startsWith(dialCode)) {
    throw new BadRequestException("Enter a valid phone number for the selected country.");
  }

  const password = body.password;
  if (typeof password !== "string" || password.length < 8 || password.length > 256 || Buffer.byteLength(password, "utf8") > 1024) {
    throw new BadRequestException("Enter a password that meets the configured password requirements.");
  }
  const status = body.status;
  if (!Object.values(UserStatus).includes(status as UserStatus)) throw new BadRequestException("Choose an account status.");
  const accountType = body.accountType;
  if (accountType !== "FIRM" && accountType !== "LAWYER" && accountType !== "ASSISTANT") {
    throw new BadRequestException("Choose Firm, Lawyer, or Assistant.");
  }

  const common = { firstName, lastName, fullName, username, email, countryCode, phoneNumber, password, status: status as UserStatus, accountType: accountType as PracticeAccountType };
  if (accountType === "FIRM") {
    if (body.workspaceMode !== undefined || body.workspaceId !== undefined || body.practiceName !== undefined || body.supervisorMembershipId !== undefined) {
      throw new BadRequestException("Firm accounts cannot include lawyer or assistant workspace fields.");
    }
    return { ...common, firmName: text(body, "firmName", 200) };
  }
  if (body.firmName !== undefined) throw new BadRequestException("Firm name is only valid for Firm accounts.");
  if (accountType === "LAWYER") {
    const workspaceMode = body.workspaceMode;
    if (workspaceMode !== "INDIVIDUAL" && workspaceMode !== "FIRM") throw new BadRequestException("Choose an individual or firm workspace for the lawyer.");
    if (body.supervisorMembershipId !== undefined) throw new BadRequestException("Lawyer accounts cannot include an assistant supervisor.");
    if (workspaceMode === "FIRM") {
      if (body.practiceName !== undefined) throw new BadRequestException("A firm lawyer must use the selected firm's workspace.");
      return { ...common, workspaceMode, workspaceId: uuid(body.workspaceId) };
    }
    if (body.workspaceId !== undefined) throw new BadRequestException("An individual lawyer cannot select a firm workspace.");
    return { ...common, workspaceMode, ...(body.practiceName === undefined ? {} : { practiceName: text(body, "practiceName", 200) }) };
  }
  if (body.workspaceMode !== undefined || body.workspaceId !== undefined || body.practiceName !== undefined) {
    throw new BadRequestException("Assistant accounts use their supervising lawyer's workspace.");
  }
  return { ...common, supervisorMembershipId: uuid(body.supervisorMembershipId) };
}

export function validateProfilePhoto(file: unknown): ValidProfilePhoto | null {
  if (file === undefined || file === null) return null;
  if (typeof file !== "object" || !("buffer" in file) || !Buffer.isBuffer(file.buffer)
    || !("size" in file) || typeof file.size !== "number" || file.size !== file.buffer.length
    || file.size === 0 || file.size > 2 * 1024 * 1024) {
    throw new BadRequestException("Choose a profile image smaller than 2 MB.");
  }
  const candidate = file as UploadedProfilePhoto;
  const detected = profilePhotoFormat(candidate.buffer);
  if (!detected || candidate.mimetype !== detected.mediaType) {
    throw new BadRequestException("Only valid PNG, JPG, and GIF profile images are accepted. SVG is not supported.");
  }
  return detected;
}

function profilePhotoFormat(bytes: Buffer): ValidProfilePhoto | null {
  let detected: ValidProfilePhoto | null = null;
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    detected = { mediaType: "image/png", extension: "png" };
  } else if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    detected = { mediaType: "image/jpeg", extension: "jpg" };
  } else if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))) {
    detected = { mediaType: "image/gif", extension: "gif" };
  }
  return detected;
}

export function profilePhotoMediaType(bytes: Buffer): ValidProfilePhoto["mediaType"] | null {
  return profilePhotoFormat(bytes)?.mediaType ?? null;
}

function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new BadRequestException("Choose a valid workspace or supervising lawyer.");
  return value;
}
