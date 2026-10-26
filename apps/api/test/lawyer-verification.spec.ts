import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { decryptCredentialIdentifier, encryptCredentialIdentifier } from "../src/lawyer-verification/lawyer-credential-crypto";
import { MAX_CREDENTIAL_DOCUMENT_BYTES, validateCredentialFile } from "../src/lawyer-verification/credential-document";
import { parseCredentialDraft, parseReviewInput, parseSubmissionInput } from "../src/lawyer-verification/lawyer-verification.dto";
import { PrivateDocumentStorage } from "../src/lawyer-verification/private-document-storage";
import type { AuthEnvironment } from "../src/auth/auth.types";

test("credential submissions normalize bounded fields and reject forged properties", () => {
  assert.deepEqual(parseSubmissionInput({ cardHolderName: "  Alex   Lawyer ", professionalRegulator: " Example Bar ", jurisdiction: "North District", cardIdentifier: " BAR-0123 " }), {
    cardHolderName: "Alex Lawyer", professionalRegulator: "Example Bar", jurisdiction: "North District", cardIdentifier: "BAR-0123",
  });
  assert.throws(() => parseSubmissionInput({ cardHolderName: "A", professionalRegulator: "Bar", jurisdiction: "X", cardIdentifier: "1", status: "APPROVED" }), BadRequestException);
  assert.throws(() => parseSubmissionInput({ cardHolderName: "A", professionalRegulator: "", jurisdiction: "X", cardIdentifier: "bad\nvalue" }), BadRequestException);
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
  assert.deepEqual(parseReviewInput({ decision: "CHANGES_REQUESTED", reason: "Upload an unexpired certificate." }), {
    decision: "CHANGES_REQUESTED", reason: "Upload an unexpired certificate.",
  });
  assert.throws(() => parseReviewInput({ decision: "REJECTED" }), BadRequestException);
  assert.throws(() => parseReviewInput({ decision: "CHANGES_REQUESTED" }), BadRequestException);
  assert.throws(() => parseReviewInput({ decision: "PENDING", status: "APPROVED" }), BadRequestException);
});

test("lawyer credential drafts accept incomplete data and reject forged fields", () => {
  assert.deepEqual(parseCredentialDraft({ cardHolderName: "  Alex  Lawyer " }), { cardHolderName: "Alex Lawyer" });
  assert.throws(() => parseCredentialDraft({ status: "APPROVED" }), BadRequestException);
  assert.throws(() => parseCredentialDraft({ cardIdentifier: "bad\nidentifier" }), BadRequestException);
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

test("local private storage persists and removes tenant-scoped objects with private permissions", async () => {
  const previousCwd = process.cwd();
  const root = await mkdtemp(join(tmpdir(), "jurismind-private-storage-"));
  process.chdir(root);
  try {
    const storage = new PrivateDocumentStorage({ nodeEnv: "test" } as AuthEnvironment);
    const key = "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.private";
    const document = Buffer.from("synthetic private document");
    await storage.put(key, document);
    assert.deepEqual(await storage.read(key), document);
    await assert.rejects(storage.put(key, document));
    await assert.rejects(storage.read("00000000-0000-4000-8000-000000000003/../../outside.private"), ServiceUnavailableException);
    if (process.platform !== "win32") {
      assert.equal((await stat(join(root, ".private-document-storage"))).mode & 0o777, 0o700);
      assert.equal((await stat(join(root, ".private-document-storage", "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002.private"))).mode & 0o777, 0o600);
    }
    await storage.remove(key);
    await assert.rejects(storage.read(key));
  } finally {
    process.chdir(previousCwd);
    await rm(root, { recursive: true, force: true });
  }
});

test("S3-compatible document storage signs private tenant-scoped requests and bounds reads", async () => {
  const environment = { nodeEnv: "test", privateDocumentStorage: { driver: "s3" as const,
    endpoint: "https://objects.example.invalid", region: "test-1", bucket: "private-documents",
    accessKeyId: "access-test", secretAccessKey: "secret-test" } } as AuthEnvironment;
  const previousFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string; authorization: string; payloadHash: string }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    requests.push({ url: String(input), method: init?.method ?? "GET", authorization: headers.get("authorization") ?? "",
      payloadHash: headers.get("x-amz-content-sha256") ?? "" });
    return init?.method === "GET" ? new Response(Buffer.from("private-pdf"), { status: 200 }) : new Response(null, { status: 204 });
  }) as typeof fetch;
  try {
    const storage = new PrivateDocumentStorage(environment);
    const key = "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.private";
    const document = Buffer.from("private-pdf");
    await storage.put(key, document);
    assert.deepEqual(await storage.read(key), document);
    await storage.remove(key);
    assert.equal(requests.length, 3);
    assert.equal(new URL(requests[0]!.url).pathname, `/private-documents/${key}`);
    assert.equal(requests.every((request) => request.authorization.startsWith("AWS4-HMAC-SHA256 Credential=access-test/")), true);
    assert.equal(requests[0]!.authorization.includes("SignedHeaders=host;x-amz-content-sha256;x-amz-date"), true);
    assert.equal(requests[0]!.payloadHash, createHash("sha256").update(document).digest("hex"));
    await assert.rejects(storage.read("00000000-0000-4000-8000-000000000003/../../outside.private"), ServiceUnavailableException);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
