"use client";

import { CALLS } from "@/lib/calls";
import { CallGlyph } from "@/components/call-glyph";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RulesDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" className="h-8" />}
      >
        Rules
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">How a code lands</DialogTitle>
          <DialogDescription>
            Six digits, ABCDEF. AB is the card, CD the row, EF the column.
            250417 is card 25, row 04, column 17.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-[50vh] flex-col gap-3 overflow-auto pr-1">
          {CALLS.map((call) => (
            <li key={call.id} className="flex items-center gap-3">
              <CallGlyph kind={call.glyph} />
              <div>
                <p className="font-heading text-lg leading-none">{call.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{call.summary}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Click a square or type a code to daub it. Daub it again and the square
          shows 2×, 3×, and a deeper green. Right-click, or Remove one, takes a
          daub back. Lines run left to right.
        </p>
        <p className="text-sm text-muted-foreground">
          Logging in takes a code from your authenticator. The first successful
          code each day is daubed for you. Later logins the same day leave that
          square as it is.
        </p>
      </DialogContent>
    </Dialog>
  );
}
