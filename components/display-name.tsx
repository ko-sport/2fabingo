"use client";

import { useActionState, useState } from "react";
import { renameAction, type RenameState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: RenameState = {};

export function DisplayName({
  username,
  sessionToken,
}: {
  username: string;
  sessionToken: string;
}) {
  const [name, setName] = useState(username);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (previous: RenameState, formData: FormData) => {
    const next = await renameAction(previous, formData);
    if (next.username) {
      setName(next.username);
      setOpen(false);
    }
    return next;
  }, initial);

  return (
    <>
      <button
        type="button"
        data-testid="display-name"
        className="font-mono text-sm text-[#f4f7f2] underline-offset-2 hover:underline"
        onClick={() => setOpen(true)}
      >
        {name}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Name on the card</DialogTitle>
            <DialogDescription>
              This is the name in the corner. Your email and password stay the same.
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="session" value={sessionToken} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Name</Label>
              <Input
                id="username"
                name="username"
                key={name}
                defaultValue={name}
                autoComplete="username"
                minLength={3}
                maxLength={20}
                required
                className="h-10 font-mono"
              />
              <p className="text-sm text-muted-foreground">3–20 letters, numbers, or underscores.</p>
            </div>
            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="h-10">
              {pending ? "Saving…" : "Save name"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
