import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMarkDay, parseMarkedAt } from "./mark-day";

describe("mark day", () => {
  it("reads a sqlite timestamp as UTC", () => {
    assert.equal(parseMarkedAt("2026-10-15 23:30:00").toISOString(), "2026-10-15T23:30:00.000Z");
  });

  it("writes the local calendar day as dd/mm/yy", () => {
    assert.equal(formatMarkDay(new Date(2026, 9, 15)), "15/10/26");
    assert.equal(formatMarkDay(new Date(2026, 0, 2)), "02/01/26");
  });
});
