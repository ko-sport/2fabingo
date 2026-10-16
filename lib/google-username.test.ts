import assert from "node:assert/strict";
import test from "node:test";
import { nextUsername, usernameFromGoogle } from "./google-username";

test("builds a username from the email", () => {
  assert.equal(
    usernameFromGoogle({ email: "Chris.Brooks@example.com", name: "Chris", sub: "1" }),
    "ChrisBrooks",
  );
});

test("pads a short name with the Google id", () => {
  const name = usernameFromGoogle({ email: "ab@example.com", name: "Al", sub: "998877" });
  assert.match(name, /^[a-zA-Z0-9_]{3,20}$/);
  assert.match(name, /998877/);
});

test("adds a numeric suffix without passing 20 characters", () => {
  assert.equal(nextUsername("chrisbrooks", 2), "chrisbrooks2");
  assert.equal(nextUsername("a".repeat(20), 12).length, 20);
});
