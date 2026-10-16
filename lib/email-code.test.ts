import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmailCode, emailCodeMatches, hashEmailCode, maskEmail } from "./email-code";

describe("email codes", () => {
  it("matches only the code and account it was made for", () => {
    const hash = hashEmailCode("042817", 7);
    assert.equal(emailCodeMatches(hash, "042817", 7), true);
    assert.equal(emailCodeMatches(hash, "042818", 7), false);
    assert.equal(emailCodeMatches(hash, "042817", 8), false);
  });

  it("draws a six-digit code", () => {
    assert.match(createEmailCode(), /^\d{6}$/);
  });

  it("hides the middle of an address", () => {
    assert.equal(maskEmail("ada@example.com"), "a•••@example.com");
  });
});
