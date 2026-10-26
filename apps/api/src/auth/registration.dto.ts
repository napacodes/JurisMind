import { BadRequestException } from "@nestjs/common";

export type RegistrationKind = "firm" | "lawyer";
export type AccountRegistration = { fullName: string; email: string; password: string; firmName?: string };

export function parseAccountRegistration(value: unknown, kind: RegistrationKind): AccountRegistration {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("Invalid registration details.");
  const body = value as Record<string, unknown>;
  const allowed = kind === "firm" ? ["fullName", "email", "password", "firmName"] : ["fullName", "email", "password"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new BadRequestException("Invalid registration details.");
  if (typeof body.fullName !== "string" || typeof body.email !== "string" || typeof body.password !== "string") {
    throw new BadRequestException("Invalid registration details.");
  }
  const fullName = body.fullName.trim();
  const email = body.email.trim().toLowerCase();
  if (fullName.length < 1 || fullName.length > 200 || /[\u0000-\u001f\u007f]/.test(fullName)) {
    throw new BadRequestException("Enter a valid name of 1 to 200 characters.");
  }
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException("Enter a valid email address.");
  }
  if (body.password.length < 8 || body.password.length > 256 || Buffer.byteLength(body.password, "utf8") > 1024) {
    throw new BadRequestException("Password must be between 8 and 256 characters.");
  }
  if (kind === "firm") {
    if (typeof body.firmName !== "string") throw new BadRequestException("Enter a firm name.");
    const firmName = body.firmName.trim();
    if (firmName.length < 1 || firmName.length > 200 || /[\u0000-\u001f\u007f]/.test(firmName)) {
      throw new BadRequestException("Enter a valid firm name of 1 to 200 characters.");
    }
    return { fullName, email, password: body.password, firmName };
  }
  return { fullName, email, password: body.password };
}
