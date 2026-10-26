import assert from "node:assert/strict";
import { test } from "node:test";
import { firmKycDocumentRequirementsFor, lawyerCredentialDocumentRequiredFor, validateEnvironment } from "../src/config/env.validation";
import { parseAddMembership } from "../src/memberships/membership.dto";
import { parseAccountRegistration } from "../src/auth/registration.dto";
import { parseFirmReviewInput, parseFirmVerificationInput } from "../src/firm-verification/firm-verification.dto";
import { parseIdempotencyKey, parseIndividualPractice } from "../src/workspaces/individual-practice.dto";

const valid = {
  PORT: "4000",
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://local:local@localhost:5432/jurismind_dev",
  TRUSTED_ORIGINS: "http://localhost:3000",
  SESSION_TTL_SECONDS: "43200",
  PASSWORD_MIN_LENGTH: "12",
  LOGIN_RATE_LIMIT_MAX: "5",
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: "900",
};

test("authentication environment requires explicit exact trusted origins and bounded policy values", () => {
  assert.equal(validateEnvironment(valid).sessionTtlSeconds, 43_200);
  assert.throws(() => validateEnvironment({ ...valid, TRUSTED_ORIGINS: "*" }));
  assert.throws(() => validateEnvironment({ ...valid, TRUSTED_ORIGINS: "http://localhost:3000/path" }));
  assert.throws(() => validateEnvironment({ ...valid, NODE_ENV: "production", TRUSTED_ORIGINS: "http://localhost:3000" }));
  assert.throws(() => validateEnvironment({ ...valid, SESSION_TTL_SECONDS: "0" }));
  assert.throws(() => validateEnvironment({ ...valid, NODE_ENV: undefined }));
  assert.equal(validateEnvironment({ ...valid, INVITATION_DEV_TOKEN_DELIVERY: "true" }).invitationDevTokenDelivery, true);
  assert.equal(validateEnvironment(valid).invitationDevTokenDelivery, false);
  assert.throws(() => validateEnvironment({ ...valid, NODE_ENV: "production", INVITATION_DEV_TOKEN_DELIVERY: "true" }));
  assert.throws(() => validateEnvironment({ ...valid, INVITATION_DEV_TOKEN_DELIVERY: "yes" }));
});

test("MFA encryption and password-reset gateway configuration are validated without exposing values", () => {
  const key = Buffer.alloc(32, 3).toString("base64");
  const validWithServices = {
    ...valid,
    MFA_ENCRYPTION_KEY: key,
    PUBLIC_WEB_URL: "http://localhost:3000",
    PASSWORD_RESET_EMAIL_ENDPOINT: "https://mail.example.invalid/send",
    PASSWORD_RESET_EMAIL_API_KEY: "local-test-only",
    PASSWORD_RESET_EMAIL_FROM: "security@example.invalid",
  };
  assert.equal(validateEnvironment(validWithServices).mfaEncryptionKey?.length, 32);
  assert.equal(validateEnvironment(validWithServices).passwordResetEmailEndpoint, "https://mail.example.invalid/send");
  assert.throws(() => validateEnvironment({ ...valid, MFA_ENCRYPTION_KEY: "short" }));
  assert.throws(() => validateEnvironment({ ...valid, PASSWORD_RESET_EMAIL_API_KEY: "partial" }));
  assert.throws(() => validateEnvironment({ ...validWithServices, PASSWORD_RESET_EMAIL_ENDPOINT: "http://mail.example.invalid/send" }));
  assert.throws(() => validateEnvironment({ ...validWithServices, NODE_ENV: "production", TRUSTED_ORIGINS: "https://app.example.invalid", PUBLIC_WEB_URL: undefined, MFA_ENCRYPTION_KEY: undefined }));
});

test("lawyer credential identifier encryption requires a valid 32-byte key and is mandatory in production", () => {
  const key = Buffer.alloc(32, 9).toString("base64");
  assert.equal(validateEnvironment({ ...valid, LAWYER_CREDENTIAL_ENCRYPTION_KEY: key }).lawyerCredentialEncryptionKey?.length, 32);
  assert.throws(() => validateEnvironment({ ...valid, LAWYER_CREDENTIAL_ENCRYPTION_KEY: "invalid" }));
  assert.throws(() => validateEnvironment({ ...valid, NODE_ENV: "production", TRUSTED_ORIGINS: "https://app.example.invalid", PUBLIC_WEB_URL: "https://app.example.invalid", MFA_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString("base64"), PASSWORD_RESET_EMAIL_ENDPOINT: "https://mail.example.invalid/send", PASSWORD_RESET_EMAIL_API_KEY: "configured", PASSWORD_RESET_EMAIL_FROM: "security@example.invalid" }));
});

test("production document storage requires complete private S3 configuration", () => {
  const production = { ...valid, NODE_ENV: "production", TRUSTED_ORIGINS: "https://app.example.invalid",
    PUBLIC_WEB_URL: "https://app.example.invalid", MFA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    LAWYER_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString("base64"),
    PASSWORD_RESET_EMAIL_ENDPOINT: "https://mail.example.invalid/send", PASSWORD_RESET_EMAIL_API_KEY: "configured",
    PASSWORD_RESET_EMAIL_FROM: "security@example.invalid" };
  assert.throws(() => validateEnvironment(production));
  const s3 = validateEnvironment({ ...production, PRIVATE_DOCUMENT_STORAGE_DRIVER: "s3",
    PRIVATE_DOCUMENT_S3_ENDPOINT: "https://objects.example.invalid", PRIVATE_DOCUMENT_S3_REGION: "test-1",
    PRIVATE_DOCUMENT_S3_BUCKET: "jurismind-private-documents", PRIVATE_DOCUMENT_S3_ACCESS_KEY_ID: "test-access",
    PRIVATE_DOCUMENT_S3_SECRET_ACCESS_KEY: "test-secret" });
  assert.deepEqual(s3.privateDocumentStorage, { driver: "s3", endpoint: "https://objects.example.invalid",
    region: "test-1", bucket: "jurismind-private-documents", accessKeyId: "test-access", secretAccessKey: "test-secret" });
  assert.throws(() => validateEnvironment({ ...production, PRIVATE_DOCUMENT_STORAGE_DRIVER: "s3",
    PRIVATE_DOCUMENT_S3_ENDPOINT: "http://objects.example.invalid", PRIVATE_DOCUMENT_S3_REGION: "test-1",
    PRIVATE_DOCUMENT_S3_BUCKET: "jurismind-private-documents", PRIVATE_DOCUMENT_S3_ACCESS_KEY_ID: "test-access",
    PRIVATE_DOCUMENT_S3_SECRET_ACCESS_KEY: "test-secret" }));
  assert.throws(() => validateEnvironment({ ...production, PRIVATE_DOCUMENT_STORAGE_DRIVER: "s3",
    PRIVATE_DOCUMENT_S3_REGION: "test-1", PRIVATE_DOCUMENT_S3_BUCKET: "bad..bucket",
    PRIVATE_DOCUMENT_S3_ACCESS_KEY_ID: "test-access", PRIVATE_DOCUMENT_S3_SECRET_ACCESS_KEY: "test-secret" }));
});

test("verification policy configuration is normalized, scoped, and bounded to supported document kinds", () => {
  const configured = validateEnvironment({ ...valid,
    FIRM_KYC_DOCUMENT_POLICY_JSON: JSON.stringify({ default: ["REGISTRATION", "AUTHORITY"],
      byJurisdictionAndLegalForm: { "Example District|Limited Liability Company": ["REGISTRATION"] } }),
    LAWYER_CREDENTIAL_DOCUMENT_POLICY_JSON: JSON.stringify({ default: true, byJurisdiction: { "Example District": false } }),
  });
  assert.deepEqual(firmKycDocumentRequirementsFor(configured.firmKycDocumentPolicy, " example  district ", "limited liability company"), ["REGISTRATION"]);
  assert.deepEqual(firmKycDocumentRequirementsFor(configured.firmKycDocumentPolicy, "Other", "Partnership"), ["REGISTRATION", "AUTHORITY"]);
  assert.equal(lawyerCredentialDocumentRequiredFor(configured.lawyerCredentialDocumentPolicy, " example district "), false);
  assert.equal(lawyerCredentialDocumentRequiredFor(configured.lawyerCredentialDocumentPolicy, "Other"), true);
  assert.throws(() => validateEnvironment({ ...valid, FIRM_KYC_DOCUMENT_POLICY_JSON: JSON.stringify({ default: ["IDENTITY"] }) }));
  assert.throws(() => validateEnvironment({ ...valid, LAWYER_CREDENTIAL_DOCUMENT_POLICY_JSON: "not json" }));
});

test("local reset sink is development-only, explicitly enabled, and requires a separate access key", () => {
  const sinkEnvironment = {
    ...valid,
    LOCAL_PASSWORD_RESET_SINK_ENABLED: "true",
    LOCAL_PASSWORD_RESET_SINK_KEY: "test-only-key-with-at-least-32-bytes",
  };
  assert.equal(validateEnvironment(sinkEnvironment).localPasswordResetSinkEnabled, true);
  assert.throws(() => validateEnvironment({ ...sinkEnvironment, NODE_ENV: "production", TRUSTED_ORIGINS: "https://app.example.invalid", PUBLIC_WEB_URL: "https://app.example.invalid", MFA_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString("base64"), PASSWORD_RESET_EMAIL_ENDPOINT: "https://mail.example.invalid/send", PASSWORD_RESET_EMAIL_API_KEY: "configured", PASSWORD_RESET_EMAIL_FROM: "security@example.invalid" }));
  assert.throws(() => validateEnvironment({ ...valid, LOCAL_PASSWORD_RESET_SINK_ENABLED: "true" }));
  assert.throws(() => validateEnvironment({ ...valid, LOCAL_PASSWORD_RESET_SINK_ENABLED: "false", LOCAL_PASSWORD_RESET_SINK_KEY: "test-only-key-with-at-least-32-bytes" }));
  assert.throws(() => validateEnvironment({ ...valid, LOCAL_PASSWORD_RESET_SINK_ENABLED: "enabled" }));
});

test("invitation roles accept only scoped practice roles", () => {
  const userId = "7e662b74-0400-4c57-b01d-9fa7f8ae4140";
  assert.equal(parseAddMembership({ userId, role: "ASSISTANT" }).role, "ASSISTANT");
  assert.deepEqual(parseAddMembership({ email: " LAWYER@example.test ", role: "ASSISTANT", supervisorMembershipId: userId }), {
    email: "lawyer@example.test", role: "ASSISTANT", supervisorMembershipId: userId,
  });
  assert.throws(() => parseAddMembership({ userId, role: "SUPER_ADMIN" }));
  assert.throws(() => parseAddMembership({ userId, role: "ASSISTANT", workspaceId: userId }));
  assert.throws(() => parseAddMembership({ userId, email: "a@example.test", role: "LAWYER" }));
  assert.throws(() => parseAddMembership({ userId: 42, email: "a@example.test", role: "LAWYER" }));
  assert.throws(() => parseAddMembership({ email: "bad", role: "LAWYER" }));
});

test("account registration validates exact firm and lawyer fields and normalizes identity", () => {
  assert.deepEqual(parseAccountRegistration({ fullName: "  Firm Admin  ", email: " ADMIN@Example.test ", password: "long-enough-12", firmName: " Cedar Legal " }, "firm"), {
    fullName: "Firm Admin", email: "admin@example.test", password: "long-enough-12", firmName: "Cedar Legal",
  });
  assert.deepEqual(parseAccountRegistration({ fullName: "Lawyer", email: "lawyer@example.test", password: "long-enough-12" }, "lawyer"), {
    fullName: "Lawyer", email: "lawyer@example.test", password: "long-enough-12",
  });
  assert.throws(() => parseAccountRegistration({ fullName: "Admin", email: "a@example.test", password: "long-enough-12", role: "SUPER_ADMIN" }, "firm"));
  assert.throws(() => parseAccountRegistration({ fullName: "Lawyer", email: "bad", password: "long-enough-12" }, "lawyer"));
  assert.throws(() => parseAccountRegistration({ fullName: "Lawyer", email: "lawyer@example.test", password: "short" }, "lawyer"));
  assert.throws(() => parseAccountRegistration({ fullName: "Admin", email: "a@example.test", password: "long-enough-12" }, "firm"));
});

test("firm KYC input is normalized, exact, and requires an auditable review reason", () => {
  const details = { legalName: "  Cedar   Legal LLC ", registrationNumber: "  REG-123 ", jurisdiction: "North District",
    legalForm: "Limited liability company", registeredAddress: "  1 Cedar Way ", representativeName: "A. Admin",
    representativeTitle: "Managing Partner", authorityDescription: "Authorized by the board resolution." };
  assert.deepEqual(parseFirmVerificationInput(details), { ...details, legalName: "Cedar Legal LLC", registrationNumber: "REG-123",
    jurisdiction: "North District", legalForm: "Limited liability company", registeredAddress: "1 Cedar Way" });
  assert.throws(() => parseFirmVerificationInput({ ...details, workspaceId: "forged" }));
  assert.throws(() => parseFirmVerificationInput({ ...details, registrationNumber: "bad\nvalue" }));
  assert.deepEqual(parseFirmReviewInput({ decision: "CHANGES_REQUESTED", reason: "Provide a current authority resolution." }), {
    decision: "CHANGES_REQUESTED", reason: "Provide a current authority resolution.",
  });
  assert.throws(() => parseFirmReviewInput({ decision: "REJECTED" }));
});

test("individual-practice input accepts only a normalized name and a valid idempotency key", () => {
  assert.deepEqual(parseIndividualPractice({ name: "  Northside Legal  " }), { name: "Northside Legal" });
  assert.throws(() => parseIndividualPractice({ name: "Northside Legal", userId: "forged" }));
  assert.throws(() => parseIndividualPractice({ name: "Northside Legal", role: "SUPER_ADMIN" }));
  assert.throws(() => parseIndividualPractice({ name: "   " }));
  assert.equal(parseIdempotencyKey("request-123"), "request-123");
  assert.throws(() => parseIdempotencyKey(undefined));
});
