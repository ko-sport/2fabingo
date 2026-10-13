"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { logoutAction } from "@/app/actions/auth";
import {
  daubManyAction,
  importMarksAction,
  reloadMarksAction,
} from "@/app/actions/marks";
import { detectNewCall, type CallEvent } from "@/lib/bingo";
import { formatCode, makeCode, pad2, parseCode, splitCode } from "@/lib/codes";
import { Achievements } from "@/components/achievements";
import { CardStore, CardStoreProvider, useAnalysis, useCardStore, useCount } from "@/components/card-store";
import { CardWall } from "@/components/card-wall";
import { CodeEntry } from "@/components/code-entry";
import { MiniGrid } from "@/components/mini-grid";
import { RulesDialog } from "@/components/rules-dialog";
import { StampOverlay } from "@/components/stamp-overlay";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STAMP_LABEL } from "@/lib/calls";

type Recent = { code: number; count: number };
type Cell = { row: number; col: number };

export function BoardApp({
  username,
  initialMarks,
  initialRecent,
}: {
  username: string;
  initialMarks: [number, number][];
  initialRecent: Recent[];
}) {
  const [store] = useState(() => new CardStore(initialMarks));
  return (
    <CardStoreProvider store={store}>
      <BoardShell username={username} initialRecent={initialRecent} />
    </CardStoreProvider>
  );
}

function BoardShell({
  username,
  initialRecent,
}: {
  username: string;
  initialRecent: Recent[];
}) {
  const store = useCardStore();
  const analysis = useAnalysis();
  const chain = useRef(Promise.resolve());
  const epoch = useRef(0);
  const silent = useRef(false);
  const previous = useRef<typeof analysis | null>(null);
  const [recent, setRecent] = useState<Recent[]>(initialRecent);
  const [selected, setSelected] = useState(() =>
    initialRecent[0] ? splitCode(initialRecent[0].code).card : 0,
  );
  const [cursor, setCursor] = useState<Cell | null>(() =>
    initialRecent[0]
      ? {
          row: splitCode(initialRecent[0].code).row,
          col: splitCode(initialRecent[0].code).col,
        }
      : null,
  );
  const [hover, setHover] = useState<Cell | null>(null);
  const [scrollNonce, setScrollNonce] = useState(initialRecent.length ? 1 : 0);
  const [pulse, setPulse] = useState<{ key: number; code: number | null }>({
    key: 0,
    code: null,
  });
  const [cardsOpen, setCardsOpen] = useState(true);
  const [saving, setSaving] = useState(0);
  const [stamp, setStamp] = useState<CallEvent | null>(null);
  const [pendingImport, setPendingImport] = useState<[number, number][] | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const reveal = useCallback((code: number) => {
    const parts = splitCode(code);
    setSelected(parts.card);
    setCursor({ row: parts.row, col: parts.col });
    setScrollNonce((value) => value + 1);
    setPulse((current) => ({ key: current.key + 1, code }));
  }, []);

  const remember = useCallback(
    (codes: number[]) => {
      setRecent((current) => {
        let next = current;
        for (let index = codes.length - 1; index >= 0; index--) {
          const code = codes[index];
          const count = store.get(code);
          next = next.filter((item) => item.code !== code);
          if (count > 0) next = [{ code, count }, ...next];
        }
        return next.slice(0, 8);
      });
    },
    [store],
  );

  const persist = useCallback(
    (entries: { code: number; delta: number }[], focus = true) => {
      if (entries.length === 0) return;
      const grouped = new Map<number, number>();
      for (const entry of entries) {
        grouped.set(entry.code, (grouped.get(entry.code) ?? 0) + entry.delta);
      }
      const my = ++epoch.current;
      for (const [code, delta] of grouped) {
        store.set(code, Math.max(0, Math.min(9999, store.get(code) + delta)));
      }
      const codes = [...grouped.keys()];
      remember(codes);
      if (focus) reveal(codes[codes.length - 1]);
      setSaving((count) => count + 1);
      chain.current = chain.current.then(async () => {
        try {
          const result = await daubManyAction(
            [...grouped].map(([code, delta]) => ({
              code: formatCode(code),
              delta,
            })),
          );
          if ("error" in result) {
            toast.error(result.error);
            if (my === epoch.current) {
              const fresh = await reloadMarksAction();
              if (!("error" in fresh) && my === epoch.current) {
                silent.current = true;
                store.hydrate(fresh.marks);
                setRecent(fresh.recent);
              }
            }
            return;
          }
          if (my !== epoch.current) return;
          for (const [code, count] of result.counts) store.set(code, count);
          remember(result.counts.map(([code]) => code));
        } catch {
          toast.error("Couldn’t save that daub.");
          if (my === epoch.current) {
            try {
              const fresh = await reloadMarksAction();
              if (!("error" in fresh) && my === epoch.current) {
                silent.current = true;
                store.hydrate(fresh.marks);
                setRecent(fresh.recent);
              }
            } catch {
              /* Leave the optimistic squares in place. */
            }
          }
        } finally {
          setSaving((count) => Math.max(0, count - 1));
        }
      });
    },
    [remember, reveal, store],
  );

  useEffect(() => {
    const before = previous.current;
    previous.current = analysis;
    if (!before || silent.current) {
      silent.current = false;
      return;
    }
    const event = detectNewCall(before, analysis);
    if (!event) return;
    const big =
      event.first ||
      event.id === "mini-house" ||
      event.id === "full-line" ||
      event.id === "double-line" ||
      event.id === "full-house";
    if (big) setStamp(event);
    else toast(STAMP_LABEL[event.id], { description: event.detail });
  }, [analysis]);

  const active = hover
    ? { card: selected, ...hover }
    : cursor
      ? { card: selected, ...cursor }
      : null;
  const activeCode = active ? makeCode(active.card, active.row, active.col) : null;

  function onCodes(raws: string[]) {
    const entries = raws.flatMap((raw) => {
      const code = parseCode(raw);
      return code === null ? [] : [{ code, delta: 1 }];
    });
    for (let index = 0; index < entries.length; index += 2000) {
      persist(entries.slice(index, index + 2000));
    }
  }

  function exportCard() {
    const payload = {
      version: 1,
      marks: store.entries(),
    };
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "2fa-bingo.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File) {
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast.error("That file isn’t a bingo card.");
      return;
    }
    if (!data || typeof data !== "object" || !("marks" in data)) {
      toast.error("That file isn’t a bingo card.");
      return;
    }
    const marks = (data as { marks: unknown }).marks;
    if (!Array.isArray(marks)) {
      toast.error("That file isn’t a bingo card.");
      return;
    }
    const clean: [number, number][] = [];
    for (const entry of marks) {
      if (Array.isArray(entry) && entry.length >= 2) {
        clean.push([Number(entry[0]), Number(entry[1])]);
      } else if (entry && typeof entry === "object" && "code" in entry && "count" in entry) {
        const row = entry as { code: unknown; count: unknown };
        clean.push([Number(row.code), Number(row.count)]);
      } else {
        toast.error("That file isn’t a bingo card.");
        return;
      }
    }
    setPendingImport(clean);
  }

  function confirmImport() {
    if (!pendingImport) return;
    const marks = pendingImport;
    setPendingImport(null);
    const my = ++epoch.current;
    setSaving((count) => count + 1);
    chain.current = chain.current.then(async () => {
      try {
        const result = await importMarksAction(marks);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        if (my !== epoch.current) return;
        const fresh = await reloadMarksAction();
        if ("error" in fresh) {
          toast.error(fresh.error);
          return;
        }
        silent.current = true;
        store.hydrate(fresh.marks);
        setRecent(fresh.recent);
        if (fresh.recent[0]) reveal(fresh.recent[0].code);
        toast.success(`Imported ${result.total.toLocaleString()} squares.`);
      } catch {
        toast.error("Couldn’t import that card.");
      } finally {
        setSaving((count) => Math.max(0, count - 1));
      }
    });
  }

  const clearStamp = useCallback(() => setStamp(null), []);
  const percent =
    analysis.filled === 0
      ? "0%"
      : analysis.filled / 1_000_000 < 0.0001
        ? "<0.01%"
        : `${((analysis.filled / 1_000_000) * 100).toFixed(analysis.filled > 100_000 ? 1 : 2)}%`;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#2a241c] px-4 py-3">
        <Link href="/" className="text-xl text-[#f4efe4]">
          <Wordmark />
        </Link>
        <p className="font-mono text-sm text-[#d9cbb3]" data-testid="filled-count">
          {analysis.filled.toLocaleString()} / 1,000,000
          <span className="text-[#8d8376]"> · {percent}</span>
          <span className="text-[#8d8376]">
            {" "}
            · {analysis.totalDaubs.toLocaleString()} daubs
          </span>
          {saving > 0 ? <span className="text-[#8d8376]"> · saving</span> : null}
        </p>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-sm text-[#f4efe4]">{username}</span>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              className="border-[#3c342b] bg-transparent text-[#f4efe4] hover:bg-[#2a241c] hover:text-[#f4efe4]"
            >
              Log out
            </Button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <aside className="contents lg:block lg:overflow-y-auto lg:border-r lg:border-[#2a241c]">
          <div className="order-1 border-b border-[#2a241c] p-4 lg:border-[#2a241c]">
            <div className="paper-card rounded-2xl p-4">
              <CodeEntry onCodes={onCodes} />
              <ActiveSquare
                code={activeCode}
                onDaub={(delta) => {
                  if (activeCode === null) return;
                  persist([{ code: activeCode, delta }], false);
                }}
              />
            </div>
          </div>
          <div className="order-3 flex flex-col gap-6 p-4">
            <div className="paper-card rounded-2xl p-4">
              <Achievements />
            </div>
            <section>
              <h2 className="font-heading text-xl text-[#f4efe4]">Recent</h2>
              {recent.length === 0 ? (
                <p className="mt-2 text-sm text-[#b7ad9e]">
                  Codes you daub show up here.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1">
                  {recent.map((item) => (
                    <li key={item.code}>
                      <button
                        type="button"
                        onClick={() => reveal(item.code)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left font-mono text-sm text-[#f4efe4] hover:bg-[#2a241c]"
                      >
                        <span>{formatCode(item.code)}</span>
                        <span className="text-[#b7ad9e]">
                          {item.count > 1 ? `${item.count}×` : "1×"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="flex flex-wrap gap-2">
              <RulesDialog />
              <Button
                type="button"
                variant="outline"
                className="border-[#3c342b] bg-transparent text-[#f4efe4] hover:bg-[#2a241c] hover:text-[#f4efe4]"
                onClick={exportCard}
              >
                Export
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#3c342b] bg-transparent text-[#f4efe4] hover:bg-[#2a241c] hover:text-[#f4efe4]"
                onClick={() => fileRef.current?.click()}
              >
                Import
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void onFile(file);
                }}
              />
            </div>
          </div>
        </aside>

        <main className="order-2 flex min-w-0 flex-1 flex-col lg:min-h-0">
          <div className="order-2 shrink-0 border-b border-[#2a241c] px-4 py-3 lg:order-1">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="font-heading text-xl text-[#f4efe4]">Cards</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[#3c342b] bg-transparent text-[#f4efe4] hover:bg-[#2a241c] hover:text-[#f4efe4]"
                onClick={() => setCardsOpen((open) => !open)}
              >
                {cardsOpen ? "Hide cards" : "Show cards"}
              </Button>
            </div>
            {cardsOpen ? (
              <div className="max-w-[320px]">
                <CardWall
                  selected={selected}
                  onSelect={(card) => {
                    setSelected(card);
                    setCursor(null);
                    setHover(null);
                  }}
                />
                <p className="mt-2 text-xs text-[#b7ad9e]">
                  Amber mark: that card has a mini-line. Deep green: mini-house.
                </p>
              </div>
            ) : (
              <p className="font-mono text-sm text-[#d9cbb3]">
                Showing card {pad2(selected)}
              </p>
            )}
          </div>
          <div className="paper-card relative order-1 m-3 flex h-[68vh] min-h-[420px] flex-col overflow-hidden rounded-2xl lg:order-2 lg:m-4 lg:h-auto lg:min-h-0 lg:flex-1">
            <MiniGrid
              card={selected}
              cursor={cursor}
              scrollNonce={scrollNonce}
              onCursor={(cell, scroll) => {
                setCursor(cell);
                if (scroll) setScrollNonce((value) => value + 1);
              }}
              onHover={setHover}
              onDaub={(code, delta) => persist([{ code, delta }], false)}
              pulseKey={pulse.key}
              pulseCode={pulse.code}
            />
            {analysis.filled === 0 ? (
              <p className="pointer-events-none absolute bottom-4 left-1/2 w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-full bg-[#1c1712]/85 px-4 py-2 text-center text-sm text-[#f4efe4]">
                Type a code, or click a square. Right-click removes a daub.
              </p>
            ) : null}
          </div>
        </main>
      </div>

      <StampOverlay event={stamp} onDone={clearStamp} />

      <Dialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Replace your card?</DialogTitle>
            <DialogDescription>
              This replaces every square on your card with the{" "}
              {(pendingImport?.length ?? 0).toLocaleString()} squares in the file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingImport(null)}
            >
              Keep my card
            </Button>
            <Button type="button" onClick={confirmImport}>
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActiveSquare({
  code,
  onDaub,
}: {
  code: number | null;
  onDaub: (delta: 1 | -1) => void;
}) {
  const count = useCount(code);
  if (code === null) {
    return (
      <p className="mt-4 text-sm text-muted-foreground" data-testid="active-square">
        Hover a square, or type a code.
      </p>
    );
  }
  const parts = splitCode(code);
  return (
    <div className="mt-4 border-t border-[#e4dcc8] pt-4" data-testid="active-square">
      <p className="font-mono text-2xl tracking-[0.18em] text-[#1c1712]">
        {formatCode(code)}
      </p>
      <p className="mt-1 text-sm text-[#5c5348]">
        Card {pad2(parts.card)} · row {pad2(parts.row)} · column {pad2(parts.col)}
      </p>
      <p className="mt-1 font-mono text-sm text-[#146b43]">
        {count === 0 ? "Not daubed yet" : count === 1 ? "Daubed once" : `${count}×`}
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" onClick={() => onDaub(1)}>
          {count === 0 ? "Daub this square" : "Daub again"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={count === 0}
          onClick={() => onDaub(-1)}
        >
          Remove one
        </Button>
      </div>
    </div>
  );
}
