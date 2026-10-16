"use client";

import { useActionState } from "react";
import { setFactorAction, type AuthState } from "@/app/actions/auth";
import { FactorFields } from "@/components/factor-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SignInFactor } from "@/lib/email-code";

const initial: AuthState = {};

export function SignInChoice({
  sessionToken,
  factor,
  accountEmail,
}: {
  sessionToken: string;
  factor: SignInFactor;
  accountEmail: string | null;
}) {
  const [state, action, pending] = useActionState(setFactorAction, initial);

  return (
    <form action={action} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="session" value={sessionToken} />
      <FactorFields defaultValue={factor} />
      {accountEmail ? (
        <p className="text-sm text-[#4d6156]">Email codes go to {accountEmail}.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="accountEmail">Email for a code</Label>
          <Input id="accountEmail" name="accountEmail" type="email" autoComplete="email" maxLength={254} className="h-10" />
        </div>
      )}
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          A code from the app or from email is marked once each day. A password on its own is not.
        </p>
      )}
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
