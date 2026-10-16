const USERNAME = /[^a-zA-Z0-9_]/g;

export function usernameFromGoogle(input: {
  email?: string | null;
  name?: string | null;
  sub: string;
}): string {
  const local = input.email?.split("@")[0] ?? "";
  const source = local || input.name || "";
  let cleaned = source.replace(USERNAME, "").slice(0, 20);
  if (cleaned.length < 3) {
    const tail = input.sub.replace(USERNAME, "").slice(0, 12);
    cleaned = `g${cleaned}${tail}`.replace(USERNAME, "").slice(0, 20);
  }
  if (cleaned.length < 3) cleaned = "player";
  return cleaned;
}

export function nextUsername(base: string, taken: number): string {
  if (taken < 2) return base.slice(0, 20);
  const suffix = String(taken);
  return `${base.slice(0, Math.max(0, 20 - suffix.length))}${suffix}`;
}
