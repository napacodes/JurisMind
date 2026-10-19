import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common";

export function encryptCredentialIdentifier(value: string, key: Buffer | undefined | null): string {
  if (!key || key.length !== 32) throw new ServiceUnavailableException("Credential verification is not configured.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptCredentialIdentifier(value: string, key: Buffer | undefined | null): string {
  if (!key || key.length !== 32) throw new ServiceUnavailableException("Credential verification is not configured.");
  const [version, rawIv, rawTag, rawCiphertext] = value.split(".");
  if (version !== "v1" || !rawIv || !rawTag || !rawCiphertext) throw new InternalServerErrorException("Credential record could not be read.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(rawIv, "base64url"));
    decipher.setAuthTag(Buffer.from(rawTag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(rawCiphertext, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new InternalServerErrorException("Credential record could not be read.");
  }
}
