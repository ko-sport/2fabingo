"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const VIEWS = [
  {
    name: "The whole set",
    summary: "One hundred squares, 000000 to 010000 through 990000 to 1000000. Each square is 10,000 codes.",
  },
  {
    name: "A block of 10,000",
    summary: "Click a square on the set. The next grid is a hundred pages, 000000 to 000100, 000100 to 000200, and so on.",
  },
  {
    name: "A hundred codes",
    summary:
      "Click a page. These are the exact numbers. Click one to select it, then + adds a mark. Another mark makes it darker.",
  },
];

export function RulesDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="h-8" />}>
        Rules
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">How a code lands</DialogTitle>
          <DialogDescription>
            250417 sits in 250000 to 260000, then in 250400 to 250500, then on the
            square 250417.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-3">
          {VIEWS.map((view) => (
            <li key={view.name}>
              <p className="font-heading text-lg leading-none">{view.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{view.summary}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Type a code and press Find, or click a square. That selects it.
          + adds one. − takes one back when that square already has a mark.
        </p>
        <p className="text-sm text-muted-foreground">
          On the two larger grids, green shows how much of that square is
          already registered. On the hundred, a darker square means that exact
          code was registered again.
        </p>
        <p className="text-sm text-muted-foreground">
          You stay signed in for 30 days, and coming back starts that again.
          Sign in with an email and a password, or with Google. Codes are ones you
          already collect. Signing in does not mark a square.
        </p>
      </DialogContent>
    </Dialog>
  );
}
