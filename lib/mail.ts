export const EMAIL_SENDER_MISSING =
  "Email codes need a sender on the host. Choose an authenticator app or a password for now.";

type MailEnv = Record<string, string | undefined>;

export function emailDelivery(env: MailEnv = process.env): "resend" | "preview" | "unavailable" {
  if (env.RESEND_API_KEY?.trim()) return "resend";
  const hosted = Boolean(env.NETLIFY || env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME);
  if (!hosted && env.NODE_ENV !== "production") return "preview";
  return "unavailable";
}

export function mayPreviewEmailCode(): boolean {
  return emailDelivery() === "preview";
}

export async function sendSignInCode(
  to: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const delivery = emailDelivery();
  if (delivery === "preview") return { ok: true };
  if (delivery === "unavailable") return { ok: false, error: EMAIL_SENDER_MISSING };

  const from = process.env.EMAIL_FROM?.trim() || "2FA Bingo <codes@2fabingo.co.uk>";
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your 2FA Bingo code",
        text: [
          `Your 2FA Bingo code is ${code}.`,
          "",
          "It works for 10 minutes. The first code that signs you in each day is marked on the card.",
        ].join("\n"),
      }),
    });
  } catch (error) {
    console.error("email send failed", error);
    return { ok: false, error: "The code didn’t send. Try again in a moment." };
  }
  if (!response.ok) {
    console.error("email send failed", response.status);
    return { ok: false, error: "The code didn’t send. Try again in a moment." };
  }
  return { ok: true };
}
