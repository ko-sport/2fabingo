const USERNAME = /^[a-zA-Z0-9_]{3,20}$/;

export function validateUsername(username: string): string | null {
  if (!USERNAME.test(username)) {
    return "Use 3–20 letters, numbers, or underscores.";
  }
  return null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  const value = normalizeEmail(email);
  if (!value) return "Enter your email address.";
  if (value.length > 254 || !EMAIL.test(value)) return "Enter a real email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 72) return "Use at most 72 characters.";
  return null;
}
