import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEmail, validateEmail } from "./validators";

test("accepts an ordinary email and stores it in lower case", () => {
  assert.equal(validateEmail("  Chris@Example.com "), null);
  assert.equal(normalizeEmail("  Chris@Example.com "), "chris@example.com");
});

test("rejects an address with no domain", () => {
  assert.equal(validateEmail("chris"), "Enter a real email address.");
});
