import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { daubStyle } from "./colors";
import { makeJoinCode, normalizeJoinCode, validateJoinCode, validateTeamName } from "./team-code";

describe("team codes", () => {
  it("reads a code with spaces or lower case", () => {
    assert.equal(normalizeJoinCode("ab 23-cd"), "AB23CD");
    assert.equal(validateJoinCode("ab23cd"), null);
    assert.equal(validateJoinCode("ab"), "Enter the 6-character team code.");
  });

  it("rejects a blank team name and keeps a short one", () => {
    assert.equal(validateTeamName("  "), "Use 2–24 characters.");
    assert.equal(validateTeamName("Night shift"), null);
  });

  it("builds a 6-character code", () => {
    assert.equal(makeJoinCode(() => 0).length, 6);
  });

  it("paints a team square blue", () => {
    assert.equal(daubStyle(1, "blue").background, "rgb(186 214 242)");
    assert.notEqual(daubStyle(1, "blue").background, daubStyle(1, "green").background);
  });
});
