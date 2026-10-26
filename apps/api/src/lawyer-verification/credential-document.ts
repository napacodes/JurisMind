import { createHash, randomUUID } from "node:crypto";
import { BadRequestException } from "@nestjs/common";

export const MAX_CREDENTIAL_DOCUMENT_BYTES = 10 * 1024 * 1024;
export type UploadedCredential = { buffer: Buffer; mimetype: string; size: number };
export type ValidCredentialFile = { storageKey: string; mediaType: string; extension: string; sizeBytes: number; sha256: string };

export function scopeCredentialStorageKey(workspaceId: string, storageKey: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.private$/i.test(storageKey)) {
    throw new BadRequestException("Invalid private document key.");
  }
  return `${workspaceId}/${storageKey}`;
}

export function validateCredentialFile(file: UploadedCredential | undefined): ValidCredentialFile {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0 || file.size !== file.buffer.length
    || file.size > MAX_CREDENTIAL_DOCUMENT_BYTES) throw new BadRequestException("Upload one valid credential document up to 10 MB.");
  const detected = detectType(file.buffer);
  if (!detected || detected.mediaType !== file.mimetype) throw new BadRequestException("Only valid PDF, JPEG, and PNG documents are accepted.");
  return {
    storageKey: `${randomUUID()}.private`,
    mediaType: detected.mediaType,
    extension: detected.extension,
    sizeBytes: file.size,
    sha256: createHash("sha256").update(file.buffer).digest("hex"),
  };
}

function detectType(bytes: Buffer): { mediaType: string; extension: string } | null {
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return { mediaType: "application/pdf", extension: "pdf" };
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mediaType: "image/png", extension: "png" };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mediaType: "image/jpeg", extension: "jpg" };
  return null;
}
