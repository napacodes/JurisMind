import assert from "node:assert/strict";
import { test } from "node:test";
import { MfaCryptoService } from "../src/auth/mfa-crypto.service";
import type { AuthEnvironment } from "../src/auth/auth.types";

const environment = { mfaEncryptionKey: Buffer.alloc(32, 7) } as AuthEnvironment;
const cryptoService = new MfaCryptoService(environment);

test("TOTP follows the RFC 6238 SHA-1 six-digit test vector", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(cryptoService.codeAt(secret, 1), "287082");
  assert.equal(cryptoService.verifyTotp(secret, "287082", 59_000), 1);
  assert.equal(cryptoService.verifyTotp(secret, "000000", 59_000), null);
});

test("MFA secret encryption authenticates ciphertext and recovery codes are random, formatted, and hashed", () => {
  const secret = cryptoService.generateSecret();
  const encrypted = cryptoService.encryptSecret(secret);
  assert.equal(cryptoService.decryptSecret(encrypted), secret);
  const parts = encrypted.split(".");
  parts[3] = `${parts[3]}x`;
  assert.throws(() => cryptoService.decryptSecret(parts.join(".")));

  const codes = cryptoService.generateRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.ok(codes.every((code) => /^[A-Z2-7]{1,5}(?:-[A-Z2-7]{1,5}){5}$/.test(code)));
  const stored = cryptoService.recoveryCodeHash(codes[0]!);
  assert.match(stored, /^[a-f0-9]{64}$/);
  assert.notEqual(stored, codes[0]);
  assert.equal(cryptoService.recoveryCodeHash(codes[0]!.toLowerCase()), stored);
});
