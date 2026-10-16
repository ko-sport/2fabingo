const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validateTeamName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 24) return "Use 2–24 characters.";
  if (!/^[A-Za-z0-9]+(?:[ A-Za-z0-9]+)*$/.test(trimmed)) {
    return "Use letters, numbers, and spaces.";
  }
  return null;
}

export function canonicalTeamName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function validateJoinCode(code: string): string | null {
  if (normalizeJoinCode(code).length !== 6) return "Enter the 6-character team code.";
  return null;
}

export function makeJoinCode(random: () => number = Math.random): string {
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return code;
}
