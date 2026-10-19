import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { parsePlatformUserId, parsePlatformUserListQuery, parsePlatformUserStatus } from "../src/platform-admin/platform-users.dto";

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
