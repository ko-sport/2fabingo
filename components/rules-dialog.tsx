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
    summary:
      "One hundred squares, 000000 to 010000 through 990000 to 1000000. Each square is 10,000 codes.",
  },
  {
    name: "A block of 10,000",
    summary:
      "Click a square on the set. The next grid is a hundred pages, 000000 to 000100, 000100 to 000200, and so on.",
  },
  {
    name: "A hundred codes",
    summary: "Click a page. These are the exact numbers. A selected square has a red outline.",
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
            250417 sits in 250000 to 260000, then in 250400 to 250500, then on the square 250417.
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
          Type a code and press Find, or click your way down to it. That selects the square. It does
          not add a mark.
        </p>
        <p className="text-sm text-muted-foreground">
          + adds one. − takes one back, and it stays off while the count is 0. Another mark makes
          that square darker, and the count shows on it. Right-click takes one back too.
        </p>
        <p className="text-sm text-muted-foreground">
          On the two larger grids, pale green is a start and deep green means that square is full.
        </p>
        <p className="text-sm text-muted-foreground">
          A line is ten codes in a row, such as 000000 to 000010. A 100 is one page. A line of 100s
          is ten pages, 1,000 codes. A 10,000 is one block. Finishing any of those, or the whole
          set, shows a card you can share. The same card appears every 1,000 squares, which is 0.1%
          of the million.
        </p>
        <p className="text-sm text-muted-foreground">
          Last 20 keeps the latest codes, four across. Click one to go back to that square. The
          progress list shows the closest unfinished line, 100, line of 100s, and 10,000.
        </p>
        <p className="text-sm text-muted-foreground">
          You stay signed in for 30 days, and coming back starts that again. Sign in with an email
          and a password, or with Google. Click the name in the corner to change it. Signing in
          does not mark a square.
        </p>
      </DialogContent>
    </Dialog>
  );
}
