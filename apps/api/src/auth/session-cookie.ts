import type { Request } from "express";
import type { AuthEnvironment } from "./auth.types";
import { isValidSessionToken } from "./auth.service";

export function sessionCookieName(environment: AuthEnvironment): string {
  return environment.nodeEnv === "production"
    ? "__Host-jurismind_session"
    : "jurismind_session";
}

export function readSessionCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader || cookieHeader.length > 8_192) return undefined;
  for (const segment of cookieHeader.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0 || segment.slice(0, separator).trim() !== name) continue;
    const value = segment.slice(separator + 1).trim();
    try {
      const decoded = decodeURIComponent(value);
      return isValidSessionToken(decoded) ? decoded : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}
