import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSecret, currentCode, verifyTotp } from "./totp";

describe("totp", () => {
  it("accepts the current authenticator code and rejects a mismatch", () => {
    const secret = createSecret();
    const code = currentCode(secret, "ada");
    assert.equal(verifyTotp(secret, "ada", code), true);
    assert.equal(verifyTotp(secret, "ada", code === "000000" ? "000001" : "000000"), false);
  });

  it("ignores spaces in a pasted code", () => {
    const secret = createSecret();
    const code = currentCode(secret, "ada");
    assert.equal(verifyTotp(secret, "ada", `${code.slice(0, 3)} ${code.slice(3)}`), true);
  });
});
