"use client";

import { useState } from "react";
import { parseCode } from "@/lib/codes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CodeEntry({ onFind }: { onFind: (code: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(raw: string) {
    const code = parseCode(raw.replace(/\D/g, ""));
    if (code === null) {
      setError("Enter one code, six digits from 000000 to 999999.");
      return;
    }
    setError(null);
    setValue("");
    onFind(String(code).padStart(6, "0"));
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
      <Label htmlFor="code">Find a code</Label>
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
            setValue(next.replace(/\D/g, "").slice(0, 6));
            setError(null);
          }}
          className="h-11 font-mono text-lg tracking-[0.28em]"
        />
        <Button type="submit" className="h-11 px-4">
          Find
        </Button>
      </div>
      <p id="code-hint" className="text-sm text-muted-foreground">
        {error ??
          "Takes you to that square. + adds one."}
      </p>
    </form>
  );
}
