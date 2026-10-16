import assert from "node:assert/strict";
import test from "node:test";
import { databaseConfigMessage, schemaStatements } from "./db-config";

test("a hosted deploy without Turso names both variables", () => {
  const message = databaseConfigMessage({ url: undefined, token: undefined, hosted: true });
  assert.match(message ?? "", /TURSO_DATABASE_URL/);
  assert.match(message ?? "", /TURSO_AUTH_TOKEN/);
});

test("a URL without a token names the token", () => {
  const message = databaseConfigMessage({
    url: "libsql://bingo.example",
    token: "  ",
    hosted: true,
  });
  assert.match(message ?? "", /TURSO_AUTH_TOKEN/);
  assert.doesNotMatch(message ?? "", /Leave the Turso database empty/);
});

test("local development with no Turso URL is allowed", () => {
  assert.equal(
    databaseConfigMessage({ url: undefined, token: undefined, hosted: false }),
    null,
  );
});

test("schema script splits into individual statements", () => {
  const statements = schemaStatements(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER);
  `);
  assert.deepEqual(statements, [
    "PRAGMA foreign_keys = ON",
    "CREATE TABLE IF NOT EXISTS users (id INTEGER)",
  ]);
});
