"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "@/app/actions/auth";
import { FactorFields } from "@/components/factor-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function AuthForm({
  mode,
  action,
  notice,
}: {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const submit = mode === "login" ? "Continue" : "Create account";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type={mode === "register" ? "email" : "text"}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          aria-invalid={state.emailError ? true : undefined}
          className="h-10"
        />
        {state.emailError ? (
          <p className="text-sm text-destructive" role="alert">
            {state.emailError}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {mode === "register"
              ? "A 6-digit sign-in code is emailed here when you pick Email me a code."
              : "An older username still works."}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          maxLength={72}
          aria-invalid={state.passwordError ? true : undefined}
          className="h-10"
        />
        {state.passwordError ? (
          <p className="text-sm text-destructive" role="alert">
            {state.passwordError}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">At least 8 characters.</p>
        )}
      </div>
      {mode === "register" ? (
        <div className="flex flex-col gap-2">
          <FactorFields defaultValue="password" />
          <p className="text-sm text-muted-foreground">
            A code from the app, or a code we email you, is marked once each day. A password on its own is not.
          </p>
        </div>
      ) : null}
      {notice ? (
        <p className="text-sm text-destructive" role="alert">
          {notice}
        </p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-10">
        {pending ? "Saving…" : submit}
      </Button>
      <p className="text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/register" className="text-foreground underline underline-offset-4">
              Start a card
            </Link>
          </>
        ) : (
          <>
            Already daubing?{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
