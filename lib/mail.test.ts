import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emailDelivery } from "./mail";

describe("email delivery", () => {
  it("uses Resend when a key is set", () => {
    assert.equal(emailDelivery({ RESEND_API_KEY: "re_test", NODE_ENV: "production", NETLIFY: "true" }), "resend");
  });

  it("previews a code on a local dev machine", () => {
    assert.equal(emailDelivery({ NODE_ENV: "development" }), "preview");
  });

  it("stays quiet on the host until a sender exists", () => {
    assert.equal(emailDelivery({ NODE_ENV: "production", NETLIFY: "true" }), "unavailable");
  });
});
