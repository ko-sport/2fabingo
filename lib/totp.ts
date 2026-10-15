import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";

const ISSUER = "2FA Bingo";

export function createSecret(): string {
  return new Secret({ size: 20 }).base32;
}

function totpFor(secret: string, username: string) {
  return new TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

export function currentCode(secret: string, username: string): string {
  return totpFor(secret, username).generate();
}

/** True when the code matches this 30-second step, or the one on either side. */
export function verifyTotp(secret: string, username: string, code: string): boolean {
  const token = code.replace(/\D/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  return totpFor(secret, username).validate({ token, window: 1 }) !== null;
}

export function enrollmentUri(secret: string, username: string): string {
  return totpFor(secret, username).toString();
}

export async function qrDataUrl(secret: string, username: string): Promise<string> {
  return QRCode.toDataURL(enrollmentUri(secret, username), {
    margin: 1,
    width: 220,
    color: { dark: "#10241c", light: "#ffffff" },
  });
}

export function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}
