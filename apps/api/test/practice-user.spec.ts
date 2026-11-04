import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { parseCreatePracticeUserInput, profilePhotoMediaType, validateProfilePhoto } from "../src/platform-admin/practice-user.dto";

const common = { firstName: "Ari", lastName: "Counsel", username: "ari.counsel", email: "ARI@example.test", countryCode: "DZ", phoneNumber: "+213555123456", password: "ValidPass123!", status: "ACTIVE" };

test("practice account parser accepts the three supported account types", () => {
  assert.equal(parseCreatePracticeUserInput({ ...common, accountType: "FIRM", firmName: "North Star Legal" }).accountType, "FIRM");
  assert.equal(parseCreatePracticeUserInput({ ...common, accountType: "LAWYER", workspaceMode: "INDIVIDUAL" }).accountType, "LAWYER");
  assert.equal(parseCreatePracticeUserInput({ ...common, accountType: "ASSISTANT", supervisorMembershipId: "5f21bf6f-64ae-4f61-83e4-f9205d67db5e" }).accountType, "ASSISTANT");
});

test("practice user input normalizes unique identifiers and rejects platform or mismatched role fields", () => {
  const parsed = parseCreatePracticeUserInput({ ...common, username: " Ari_Counsel ", email: "ARI@example.test", accountType: "FIRM", firmName: " Firm " });
  assert.equal(parsed.username, "ari_counsel");
  assert.equal(parsed.email, "ari@example.test");
  assert.equal(parsed.firmName, "Firm");
  for (const value of [
    { ...common, accountType: "SUPER_ADMIN" },
    { ...common, accountType: "FIRM", firmName: "Firm", supervisorMembershipId: "5f21bf6f-64ae-4f61-83e4-f9205d67db5e" },
    { ...common, accountType: "LAWYER", workspaceMode: "FIRM" },
    { ...common, accountType: "ASSISTANT" },
    { ...common, accountType: "FIRM", firmName: "Firm", countryCode: "US", phoneNumber: "+213555123456" },
  ]) assert.throws(() => parseCreatePracticeUserInput(value), (error) => error instanceof BadRequestException);
});

test("profile image validation checks declared type, signature, and 2 MB limit", () => {
  const png = Buffer.from([137,80,78,71,13,10,26,10,0]);
  assert.equal(validateProfilePhoto({ buffer: png, size: png.length, mimetype: "image/png" })?.mediaType, "image/png");
  assert.equal(profilePhotoMediaType(Buffer.from("GIF89a")), "image/gif");
  assert.throws(() => validateProfilePhoto({ buffer: png, size: png.length, mimetype: "image/jpeg" }), (error) => error instanceof BadRequestException);
  const tooLarge = Buffer.alloc(2 * 1024 * 1024 + 1);
  assert.throws(() => validateProfilePhoto({ buffer: tooLarge, size: tooLarge.length, mimetype: "image/png" }), (error) => error instanceof BadRequestException);
  assert.throws(() => validateProfilePhoto({ buffer: Buffer.from("<svg/>"), size: 6, mimetype: "image/svg+xml" }), (error) => error instanceof BadRequestException);
});
