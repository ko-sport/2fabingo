"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function TotpForm({
  action,
  submit,
  hint,
  ticket,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  submit: string;
  hint: string;
  ticket: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="ticket" value={ticket} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Six-digit code</Label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          minLength={6}
          maxLength={6}
          pattern="[0-9]{6}"
          spellCheck={false}
          aria-invalid={state.error ? true : undefined}
          className="h-12 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 font-mono text-2xl tracking-[0.28em] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="h-10">
        {pending ? "Checking…" : submit}
      </Button>
    </form>
  );
}
