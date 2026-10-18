import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "./auth.types";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_DRIFT_STEPS = 1;

@Injectable()
export class MfaCryptoService {
  constructor(@Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment) {}

  generateSecret(): string {
    return encodeBase32(randomBytes(20));
  }

  encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
  }

  decryptSecret(envelope: string): string {
    const [version, encodedIv, encodedTag, encodedCiphertext, extra] = envelope.split(".");
    if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext || extra !== undefined) {
      throw new Error("Stored MFA secret has an unsupported encryption envelope.");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey(), Buffer.from(encodedIv, "base64url"));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  recoveryCodeHash(rawCode: string): string {
    const normalized = normalizeRecoveryCode(rawCode);
    return createHmac("sha256", this.encryptionKey()).update(`recovery-code:v1:${normalized}`).digest("hex");
  }

  generateRecoveryCodes(count = 10): string[] {
    return Array.from({ length: count }, () => formatRecoveryCode(encodeBase32(randomBytes(16))));
  }

  verifyTotp(secret: string, rawCode: string, now = Date.now()): number | null {
    if (!/^\d{6}$/.test(rawCode)) return null;
    let decoded: Buffer;
    try {
      decoded = decodeBase32(secret);
    } catch {
      return null;
    }
    const currentCounter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
    const supplied = Buffer.from(rawCode, "ascii");
    for (let offset = -TOTP_DRIFT_STEPS; offset <= TOTP_DRIFT_STEPS; offset += 1) {
      const counter = currentCounter + offset;
      if (counter < 0) continue;
      const expected = Buffer.from(totpAtCounter(decoded, counter), "ascii");
      if (timingSafeEqual(supplied, expected)) return counter;
    }
    return null;
  }

  codeAt(secret: string, counter: number): string {
    return totpAtCounter(decodeBase32(secret), counter);
  }

  private encryptionKey(): Buffer {
    const key = this.environment.mfaEncryptionKey;
    if (!key || key.length !== 32) {
      throw new ServiceUnavailableException("Multi-factor authentication is not configured.");
    }
    return key;
  }
}

export function normalizeRecoveryCode(rawCode: string): string {
  return rawCode.toUpperCase().replace(/[-\s]/g, "");
}

export function isValidRecoveryCode(rawCode: string): boolean {
  return /^[A-Z2-7]{26}$/.test(normalizeRecoveryCode(rawCode));
}

export function encodeBase32(bytes: Buffer): string {
  let accumulator = 0;
  let bits = 0;
  let output = "";
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(accumulator >>> bits) & 31];
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(accumulator << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value: string): Buffer {
  if (!/^[A-Z2-7]+$/.test(value)) throw new Error("Invalid Base32 secret.");
  let accumulator = 0;
  let bits = 0;
  const output: number[] = [];
  for (const character of value) {
    accumulator = (accumulator << 5) | BASE32_ALPHABET.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((accumulator >>> bits) & 0xff);
    }
  }
  return Buffer.from(output);
}

function formatRecoveryCode(code: string): string {
  return code.match(/.{1,5}/g)?.join("-") ?? code;
}

function totpAtCounter(secret: Buffer, counter: number): string {
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(counterBytes).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, "0");
}
