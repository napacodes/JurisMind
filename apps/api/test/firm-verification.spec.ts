import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { parseFirmReviewInput, parseFirmVerificationDraft, parseFirmVerificationInput } from "../src/firm-verification/firm-verification.dto";

const valid = {
  legalName: "  Example   Legal LLC ", registrationNumber: "REG-123", jurisdiction: "Example State",
  legalForm: "Limited liability company", registeredAddress: "1 Example Street", representativeName: "Alex Example",
  representativeTitle: "Managing Partner", authorityDescription: "Authorized by the board.",
};

test("firm verification input normalizes required values and rejects unknown fields", () => {
  assert.equal(parseFirmVerificationInput(valid).legalName, "Example Legal LLC");
  assert.throws(() => parseFirmVerificationInput({ ...valid, approved: true }), BadRequestException);
  assert.throws(() => parseFirmVerificationInput({ ...valid, jurisdiction: " " }), BadRequestException);
});

test("firm verification review requires reasons for corrections and rejection", () => {
  assert.deepEqual(parseFirmReviewInput({ decision: "APPROVED" }), { decision: "APPROVED", reason: null });
  assert.deepEqual(parseFirmReviewInput({ decision: "CHANGES_REQUESTED", reason: "Upload current authority." }),
    { decision: "CHANGES_REQUESTED", reason: "Upload current authority." });
  assert.throws(() => parseFirmReviewInput({ decision: "REJECTED" }), BadRequestException);
  assert.throws(() => parseFirmReviewInput({ decision: "APPROVED", status: "APPROVED" }), BadRequestException);
});

test("firm verification drafts accept incomplete normalized data but reject forged fields", () => {
  assert.deepEqual(parseFirmVerificationDraft({ legalName: "  Cedar   Legal " }), {
    legalName: "Cedar Legal", registrationNumber: "", jurisdiction: "", legalForm: "", registeredAddress: "",
    representativeName: "", representativeTitle: "", authorityDescription: "",
  });
  assert.throws(() => parseFirmVerificationDraft({ role: "FIRM_ADMIN" }), BadRequestException);
});
