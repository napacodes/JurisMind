import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { decryptCredentialIdentifier, encryptCredentialIdentifier } from "../src/lawyer-verification/lawyer-credential-crypto";
import { MAX_CREDENTIAL_DOCUMENT_BYTES, validateCredentialFile } from "../src/lawyer-verification/credential-document";
import { parseReviewInput, parseSubmissionInput } from "../src/lawyer-verification/lawyer-verification.dto";
import { PrivateDocumentStorage } from "../src/lawyer-verification/private-document-storage";
import type { AuthEnvironment } from "../src/auth/auth.types";

test("credential submissions normalize bounded fields and reject forged properties", () => {
  assert.deepEqual(parseSubmissionInput({ cardHolderName: "  Alex   Lawyer ", jurisdiction: "North District", cardIdentifier: " BAR-0123 " }), {
    cardHolderName: "Alex Lawyer", jurisdiction: "North District", cardIdentifier: "BAR-0123",
  });
  assert.throws(() => parseSubmissionInput({ cardHolderName: "A", jurisdiction: "X", cardIdentifier: "1", status: "APPROVED" }), BadRequestException);
  assert.throws(() => parseSubmissionInput({ cardHolderName: "A", jurisdiction: "X", cardIdentifier: "bad\nvalue" }), BadRequestException);
});

test("credential document accepts only bounded content whose bytes match an allowed MIME type", () => {
  const pdf = Buffer.from("%PDF-1.7\nsynthetic document", "ascii");
  const accepted = validateCredentialFile({ buffer: pdf, mimetype: "application/pdf", size: pdf.length });
  assert.equal(accepted.mediaType, "application/pdf");
  assert.equal(accepted.sizeBytes, pdf.length);
  assert.match(accepted.storageKey, /^[0-9a-f-]{36}\.private$/i);
  assert.throws(() => validateCredentialFile({ buffer: Buffer.from("not a pdf"), mimetype: "application/pdf", size: 9 }), BadRequestException);
  assert.throws(() => validateCredentialFile({ buffer: pdf, mimetype: "image/png", size: pdf.length }), BadRequestException);
  assert.throws(() => validateCredentialFile({ buffer: Buffer.alloc(MAX_CREDENTIAL_DOCUMENT_BYTES + 1), mimetype: "application/pdf", size: MAX_CREDENTIAL_DOCUMENT_BYTES + 1 }), BadRequestException);
  assert.throws(() => validateCredentialFile(undefined), BadRequestException);
});

test("review decisions require an explicit supported outcome and a rejection reason", () => {
  assert.deepEqual(parseReviewInput({ decision: "APPROVED" }), { decision: "APPROVED", reason: null });
  assert.deepEqual(parseReviewInput({ decision: "REJECTED", reason: "Card image is unreadable." }), { decision: "REJECTED", reason: "Card image is unreadable." });
  assert.throws(() => parseReviewInput({ decision: "REJECTED" }), BadRequestException);
  assert.throws(() => parseReviewInput({ decision: "PENDING", status: "APPROVED" }), BadRequestException);
});

test("card identifiers are authenticated-encrypted and cannot be decrypted with an incorrect key", () => {
  const key = Buffer.alloc(32, 11);
  const cipher = encryptCredentialIdentifier("BAR-012345", key);
  assert.notEqual(cipher, "BAR-012345");
  assert.equal(decryptCredentialIdentifier(cipher, key), "BAR-012345");
  assert.throws(() => decryptCredentialIdentifier(cipher, Buffer.alloc(32, 12)));
  assert.throws(() => encryptCredentialIdentifier("BAR-012345", null), ServiceUnavailableException);
});

test("the local private filesystem backend is unavailable in production mode", async () => {
  const storage = new PrivateDocumentStorage({ nodeEnv: "production" } as AuthEnvironment);
  await assert.rejects(storage.put("00000000-0000-4000-8000-000000000000.private", Buffer.from("private")), ServiceUnavailableException);
});
