import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEnvironment } from "../src/config/env.validation";
import { parseAddMembership } from "../src/memberships/membership.dto";
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

test("invitation roles accept only scoped practice roles", () => {
  const userId = "7e662b74-0400-4c57-b01d-9fa7f8ae4140";
  assert.equal(parseAddMembership({ userId, role: "ASSISTANT" }).role, "ASSISTANT");
  assert.throws(() => parseAddMembership({ userId, role: "SUPER_ADMIN" }));
  assert.throws(() => parseAddMembership({ userId, role: "ASSISTANT", workspaceId: userId }));
});

test("individual-practice input accepts only a normalized name and a valid idempotency key", () => {
  assert.deepEqual(parseIndividualPractice({ name: "  Northside Legal  " }), { name: "Northside Legal" });
  assert.throws(() => parseIndividualPractice({ name: "Northside Legal", userId: "forged" }));
  assert.throws(() => parseIndividualPractice({ name: "Northside Legal", role: "SUPER_ADMIN" }));
  assert.throws(() => parseIndividualPractice({ name: "   " }));
  assert.equal(parseIdempotencyKey("request-123"), "request-123");
  assert.throws(() => parseIdempotencyKey(undefined));
});
