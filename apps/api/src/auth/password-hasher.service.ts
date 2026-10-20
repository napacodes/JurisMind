import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

const MAX_PASSWORD_LENGTH = 256;
const MAX_PASSWORD_BYTES = 1024;
const MAX_ENCODED_HASH_LENGTH = 255;

/**
 * Argon2 implementations serialize cost parameters in their own order (node-argon2
 * emits `m=...,p=...,t=...`, others emit `m=...,t=...,p=...`), so the encoded hash is
 * parsed and each named parameter is compared against the project's exact policy.
 * Matching by name keeps verification working across hasher updates without
 * accepting weaker parameters or unsupported variants.
 */
const ENCODED_HASH_FORMAT =
  /^\$argon2id\$v=19\$([a-z]+=[1-9][0-9]*(?:,[a-z]+=[1-9][0-9]*)*)\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/;
const REQUIRED_PARAMETERS: Readonly<Record<string, number>> = {
  m: 19_456,
  t: 2,
  p: 1,
};

@Injectable()
export class PasswordHasherService {
  async hash(password: string, minimumLength: number): Promise<string> {
    this.assertValidPassword(password, minimumLength);
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: REQUIRED_PARAMETERS.m,
      timeCost: REQUIRED_PARAMETERS.t,
      parallelism: REQUIRED_PARAMETERS.p,
      hashLength: 32,
    });
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    if (!this.isWithinMaximum(password) || !isSupportedEncodedHash(encodedHash)) return false;
    try {
      return await argon2.verify(encodedHash, password);
    } catch {
      return false;
    }
  }

  assertValidPassword(password: string, minimumLength: number): void {
    if (
      !this.isWithinMaximum(password) ||
      password.length < minimumLength
    ) {
      throw new Error(`Password must be between ${minimumLength} and ${MAX_PASSWORD_LENGTH} characters.`);
    }
  }

  private isWithinMaximum(password: string): boolean {
    return (
      typeof password === "string" &&
      password.length <= MAX_PASSWORD_LENGTH &&
      Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES
    );
  }
}

/** Accept only Argon2id v=19 hashes that use exactly the project's cost parameters. */
function isSupportedEncodedHash(encodedHash: string): boolean {
  if (typeof encodedHash !== "string" || encodedHash.length > MAX_ENCODED_HASH_LENGTH) return false;
  const match = ENCODED_HASH_FORMAT.exec(encodedHash);
  if (!match) return false;

  const parameters = new Map<string, number>();
  for (const segment of match[1]!.split(",")) {
    const separator = segment.indexOf("=");
    const name = segment.slice(0, separator);
    if (separator <= 0 || parameters.has(name)) return false;
    parameters.set(name, Number(segment.slice(separator + 1)));
  }

  const required = Object.entries(REQUIRED_PARAMETERS);
  return (
    parameters.size === required.length &&
    required.every(([name, value]) => parameters.get(name) === value)
  );
}
