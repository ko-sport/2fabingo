"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const submit = mode === "login" ? "Continue" : "Create account";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={20}
          aria-invalid={state.usernameError ? true : undefined}
          className="h-10"
        />
        {state.usernameError ? (
          <p className="text-sm text-destructive" role="alert">
            {state.usernameError}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            3–20 letters, numbers, or underscores.
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
        <label className="flex items-start gap-2 text-sm text-[#14211b]">
          <input
            type="checkbox"
            name="authenticator"
            value="on"
            className="mt-1 size-4 accent-[#1f7a45]"
          />
          <span>
            Sign in with an authenticator. The code that signs you in is marked once each day.
          </span>
        </label>
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
