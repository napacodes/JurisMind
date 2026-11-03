import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { parseCreatePlatformAdminInput, parsePlatformUserId, parsePlatformUserListQuery, parsePlatformUserStatus, parsePracticeUserListQuery } from "../src/platform-admin/platform-users.dto";

test("practice account filters accept supported roles and preserve pagination defaults", () => {
  assert.deepEqual(parsePracticeUserListQuery({ role: "FIRM", kycStatus: "PENDING", emailStatus: "UNVERIFIED" }), {
    page: 1, pageSize: 10, role: "FIRM", kycStatus: "PENDING", emailStatus: "UNVERIFIED",
  });
  assert.deepEqual(parsePracticeUserListQuery({ page: "2", pageSize: "25", search: "  counsel@example.test " }), {
    page: 2, pageSize: 25, search: "counsel@example.test",
  });
});

test("practice account filters reject platform roles and unknown query fields", () => {
  for (const query of [
    { role: "SUPER_ADMIN" }, { role: "FIRM_ADMIN" }, { kycStatus: "DRAFT" },
    { emailStatus: "PENDING" }, { status: "SUSPENDED" }, { phone: "+15555550123" },
  ]) assert.throws(() => parsePracticeUserListQuery(query), (error) => error instanceof BadRequestException);
});

test("platform user query accepts bounded filters and defaults safely", () => {
  assert.deepEqual(parsePlatformUserListQuery({}), { page: 1, pageSize: 25 });
  assert.deepEqual(parsePlatformUserListQuery({
    page: "2", pageSize: "50", search: "  counsel@example.invalid  ", role: "LAWYER", status: "ACTIVE", workspaceKind: "FIRM",
  }), {
    page: 2, pageSize: 50, search: "counsel@example.invalid", role: "LAWYER", status: "ACTIVE", workspaceKind: "FIRM",
  });
  assert.deepEqual(parsePlatformUserListQuery({ role: "SUPER_ADMIN", workspaceKind: "INDIVIDUAL" }), {
    page: 1, pageSize: 25, role: "SUPER_ADMIN", workspaceKind: "INDIVIDUAL",
  });
});

test("platform user query rejects unknown, repeated, malformed, and unbounded parameters", () => {
  for (const query of [
    { ignored: "true" },
    { page: "0" },
    { page: "10001" },
    { pageSize: "101" },
    { page: ["1", "2"] },
    { role: "PLATFORM_OWNER" },
    { status: "DELETED" },
    { workspaceKind: "PERSONAL" },
    { search: "sea\ncret" },
  ]) assert.throws(() => parsePlatformUserListQuery(query), (error) => error instanceof BadRequestException);
});

test("platform user mutation body and identifier are strictly validated", () => {
  assert.equal(parsePlatformUserStatus({ status: "DISABLED" }), "DISABLED");
  assert.equal(parsePlatformUserStatus({ status: "ACTIVE" }), "ACTIVE");
  assert.throws(() => parsePlatformUserStatus({ status: "DISABLED", role: "SUPER_ADMIN" }), BadRequestException);
  assert.throws(() => parsePlatformUserStatus({ status: "SUSPENDED" }), BadRequestException);
  assert.equal(parsePlatformUserId("550e8400-e29b-41d4-a716-446655440000"), "550e8400-e29b-41d4-a716-446655440000");
  assert.throws(() => parsePlatformUserId("not-an-id"), BadRequestException);
});

test("platform admin creation input is normalized and rejects unsafe values", () => {
  assert.deepEqual(parseCreatePlatformAdminInput({
    fullName: "  Jane Admin  ",
    email: "  JANE@EXAMPLE.COM ",
    password: "valid-safepassword-123",
  }), {
    fullName: "Jane Admin",
    email: "jane@example.com",
    password: "valid-safepassword-123",
  });
  assert.throws(() => parseCreatePlatformAdminInput({ fullName: "" }), BadRequestException);
  assert.throws(() => parseCreatePlatformAdminInput({ fullName: "Jane", email: "not-an-email" }), BadRequestException);
  assert.throws(() => parseCreatePlatformAdminInput({ fullName: "Jane", email: "jane@example.com", password: "short" }), BadRequestException);
  assert.throws(() => parseCreatePlatformAdminInput({ fullName: "Jane", email: "jane@example.com", password: "password", role: "LAWYER" }), BadRequestException);
});
