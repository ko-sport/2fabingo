"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function TotpForm({
  action,
  submit,
  hint,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  submit: string;
  hint: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Six-digit code</Label>
        <Input
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
          className="h-12 font-mono text-2xl tracking-[0.28em]"
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
