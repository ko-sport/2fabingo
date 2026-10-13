"use client";

import { useState } from "react";
import { extractCodes } from "@/lib/codes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CodeEntry({
  onCodes,
}: {
  onCodes: (codes: string[]) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(raw: string) {
    const codes = extractCodes(raw);
    if (codes.length === 0) {
      setError("Codes are 6 digits, from 000000 to 999999.");
      return;
    }
    setError(null);
    setValue("");
    onCodes(codes);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const field = event.currentTarget.elements.namedItem("code");
        const typed = field instanceof HTMLInputElement ? field.value : value;
        submit(typed || value);
      }}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="code">Six-digit code</Label>
      <div className="flex gap-2">
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          spellCheck={false}
          maxLength={6}
          placeholder="000000"
          name="code"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby="code-hint"
          onValueChange={(next) => {
            const digits = next.replace(/\D/g, "").slice(0, 6);
            setValue(digits);
            setError(null);
            if (digits.length === 6) submit(digits);
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            const codes = extractCodes(text);
            if (codes.length > 1) {
              event.preventDefault();
              setValue("");
              setError(null);
              onCodes(codes);
            }
          }}
          className="h-11 font-mono text-lg tracking-[0.28em]"
        />
        <Button type="submit" className="h-11 px-4">
          Daub
        </Button>
      </div>
      <p id="code-hint" className="text-sm text-muted-foreground">
        {error ??
          "First two digits pick the card, the next two the row, the last two the column."}
      </p>
    </form>
  );
}
