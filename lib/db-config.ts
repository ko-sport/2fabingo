export const DATABASE_CONNECTION_MESSAGE =
  "The database refused the connection. Check the Turso URL and token in Netlify, then redeploy.";

export function databaseConfigMessage(input: {
  url: string | undefined;
  token: string | undefined;
  hosted: boolean;
}): string | null {
  const url = input.url?.trim() ?? "";
  const token = input.token?.trim() ?? "";
  if (url && !token) {
    return "Set TURSO_AUTH_TOKEN next to TURSO_DATABASE_URL in the Netlify site settings, then redeploy.";
  }
  if (!url && input.hosted) {
    return "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the Netlify site settings, then redeploy. Leave the Turso database empty.";
  }
  return null;
}

export function schemaStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
