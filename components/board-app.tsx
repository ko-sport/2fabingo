"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { logoutAction, touchSessionAction } from "@/app/actions/auth";
import {
  daubManyAction,
  importMarksAction,
  reloadMarksAction,
} from "@/app/actions/marks";
import { Achievements } from "@/components/achievements";
import {
  CardStore,
  CardStoreProvider,
  useAnalysis,
  useCardStore,
  useCount,
} from "@/components/card-store";
import { CodeEntry } from "@/components/code-entry";
import { LocatorGrid, type Zoom } from "@/components/locator-grid";
import { RulesDialog } from "@/components/rules-dialog";
import { SignInChoice } from "@/components/sign-in-choice";
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
import { formatCode, parseCode } from "@/lib/codes";
import {
  blockStart,
  cellCode,
  cellIndex,
  pageStart,
  spanLabel,
} from "@/lib/zoom";

type Recent = { code: number; count: number };
type Stamp = { title: string; detail: string };

export function BoardApp({
  username,
  sessionToken,
  authenticatorLogin,
  emailLogin,
  accountEmail,
  freebieCode,
  initialMarks,
  initialRecent,
}: {
  username: string;
  sessionToken: string;
  authenticatorLogin: boolean;
  emailLogin: boolean;
  accountEmail: string | null;
  freebieCode: number | null;
  initialMarks: [number, number][];
  initialRecent: Recent[];
}) {
  const [store] = useState(() => new CardStore(initialMarks));
  return (
    <CardStoreProvider store={store}>
      <BoardShell
        username={username}
        sessionToken={sessionToken}
        authenticatorLogin={authenticatorLogin}
        emailLogin={emailLogin}
        accountEmail={accountEmail}
        freebieCode={freebieCode}
        initialRecent={initialRecent}
      />
    </CardStoreProvider>
  );
}

function BoardShell({
  username,
  sessionToken,
  authenticatorLogin,
  emailLogin,
  accountEmail,
  freebieCode,
  initialRecent,
}: {
  username: string;
  sessionToken: string;
  authenticatorLogin: boolean;
  emailLogin: boolean;
  accountEmail: string | null;
  freebieCode: number | null;
  initialRecent: Recent[];
}) {
  const store = useCardStore();
  const analysis = useAnalysis();
  const chain = useRef(Promise.resolve());
  const epoch = useRef(0);
  const silent = useRef(false);
  const previous = useRef<typeof analysis | null>(null);
  const [recent, setRecent] = useState<Recent[]>(initialRecent);
  const [zoom, setZoom] = useState<Zoom>({ level: 0 });
  const [saving, setSaving] = useState(0);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [pendingImport, setPendingImport] = useState<[number, number][] | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void touchSessionAction(sessionToken);
  }, [sessionToken]);

  const locate = useCallback((code: number) => {
    setZoom({
      level: 2,
      block: Math.floor(code / 10_000),
      page: Math.floor((code % 10_000) / 100),
      focus: code,
    });
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
    (entries: { code: number; delta: number }[]) => {
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
      setSaving((count) => count + 1);
      chain.current = chain.current.then(async () => {
        try {
          const result = await daubManyAction(
            [...grouped].map(([code, delta]) => ({
              code: formatCode(code),
              delta,
            })),
            sessionToken,
          );
          if ("error" in result) {
            toast.error(result.error);
            if (my === epoch.current) {
              const fresh = await reloadMarksAction(sessionToken);
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
              const fresh = await reloadMarksAction(sessionToken);
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
    [remember, sessionToken, store],
  );

  useEffect(() => {
    const before = previous.current;
    previous.current = analysis;
    if (!before || silent.current) {
      silent.current = false;
      return;
    }
    if (!before.fullHouse && analysis.fullHouse) {
      setStamp({
        title: "Full set",
        detail: "Every code from 000000 to 999999 is registered.",
      });
      return;
    }
    const newBlock = analysis.houses.find((block) => !before.houses.includes(block));
    if (newBlock !== undefined) {
      const start = blockStart(newBlock);
      setStamp({
        title: "Block",
        detail: `${spanLabel(start, start + 10_000)} is complete.`,
      });
      return;
    }
    for (let index = 0; index < analysis.pageFill.length; index++) {
      if (analysis.pageFill[index] === 100 && before.pageFill[index] < 100) {
        const block = Math.floor(index / 100);
        const page = index % 100;
        const start = pageStart(block, page);
        setStamp({
          title: "Hundred",
          detail: `${spanLabel(start, start + 100)} is complete.`,
        });
        return;
      }
    }
  }, [analysis]);

  const clearStamp = useCallback(() => setStamp(null), []);
  const percent =
    analysis.filled === 0
      ? "0%"
      : analysis.filled / 1_000_000 < 0.0001
        ? "<0.01%"
        : `${((analysis.filled / 1_000_000) * 100).toFixed(analysis.filled > 100_000 ? 1 : 2)}%`;

  function onFind(raw: string) {
    const code = parseCode(raw);
    if (code === null) return;
    locate(code);
  }

  function openCell(index: number) {
    if (zoom.level === 0) {
      setZoom({ level: 1, block: index });
      return;
    }
    if (zoom.level === 1) {
      setZoom({ level: 2, block: zoom.block, page: index, focus: null });
    }
  }

  function registerCell(index: number, delta: 1 | -1) {
    if (zoom.level !== 2) return;
    const code = cellCode(zoom.block, zoom.page, index);
    setZoom({ ...zoom, focus: code });
    persist([{ code, delta }]);
  }

  function exportCard() {
    const payload = { version: 1, marks: store.entries() };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
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
        const result = await importMarksAction(marks, sessionToken);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        if (my !== epoch.current) return;
        const fresh = await reloadMarksAction(sessionToken);
        if ("error" in fresh) {
          toast.error(fresh.error);
          return;
        }
        silent.current = true;
        store.hydrate(fresh.marks);
        setRecent(fresh.recent);
        setZoom({ level: 0 });
        toast.success(`Imported ${result.total.toLocaleString()} squares.`);
      } catch {
        toast.error("Couldn’t import that card.");
      } finally {
        setSaving((count) => Math.max(0, count - 1));
      }
    });
  }

  const focusCode = zoom.level === 2 ? zoom.focus : null;
  const block = zoom.level === 0 ? null : zoom.block;
  const page = zoom.level === 2 ? zoom.page : null;
  const blockLabel =
    block === null ? null : spanLabel(blockStart(block), blockStart(block) + 10_000);
  const pageLabel =
    block === null || page === null
      ? null
      : spanLabel(pageStart(block, page), pageStart(block, page) + 100);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="masthead flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setZoom({ level: 0 })}
          className="text-xl text-[#f4f7f2]"
          aria-label="Back to the full grid"
          data-testid="wordmark"
        >
          <Wordmark />
        </button>
        <p className="font-mono text-sm text-[#c9ddd0]" data-testid="filled-count">
          {analysis.filled.toLocaleString()} / 1,000,000
          <span className="text-[#8eaa98]"> · {percent}</span>
          <span className="text-[#8eaa98]">
            {" "}
            · {analysis.totalDaubs.toLocaleString()} daubs
          </span>
          {saving > 0 ? <span className="text-[#8eaa98]"> · saving</span> : null}
        </p>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-sm text-[#f4f7f2]">{username}</span>
          <form action={logoutAction}>
            <input type="hidden" name="session" value={sessionToken} />
            <Button
              type="submit"
              variant="outline"
              className="border-white/20 bg-transparent text-[#f4f7f2] hover:bg-white/10 hover:text-[#f4f7f2]"
            >
              Log out
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-3 py-4 lg:px-5">
        <section className="ticket order-2 rounded-2xl p-3 sm:p-5 lg:order-2">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl text-[#14211b]">Find manually</h2>
              <p className="mt-1 text-sm text-[#4d6156]">
                {zoom.level === 2
                  ? "You can mark the same code more than once - it will go darker with every marking."
                  : "Click on the boxes to locate your 2FA code."}
              </p>
            </div>
          </div>
          <nav aria-label="Which grid" className="mb-3 flex flex-wrap items-center gap-1 text-sm">
            <Crumb current={zoom.level === 0} onClick={() => setZoom({ level: 0 })}>
              All codes
            </Crumb>
            {block !== null && blockLabel ? (
              <>
                <span className="text-[#6b7f72]">/</span>
                <Crumb
                  current={zoom.level === 1}
                  onClick={() => setZoom({ level: 1, block })}
                >
                  {blockLabel}
                </Crumb>
              </>
            ) : null}
            {pageLabel ? (
              <>
                <span className="text-[#6b7f72]">/</span>
                <Crumb current>{pageLabel}</Crumb>
              </>
            ) : null}
          </nav>
          <LocatorGrid
            zoom={zoom}
            onOpen={openCell}
            onRegister={(index) => registerCell(index, 1)}
            onRemove={(index) => registerCell(index, -1)}
          />
          <p className="mt-3 text-xs text-[#4d6156]">
            {zoom.level === 2
              ? "Right-click a number to take one registration back."
              : "Pale green is a start. Deep green means that square is full."}
          </p>
        </section>

        <aside className="order-1 flex flex-col gap-4 lg:order-1">
          <div className="ticket rounded-2xl p-4">
            <CodeEntry onFind={onFind} />
            {freebieCode !== null ? (
              <div className="mt-3 rounded-lg bg-[#e5f6eb] px-3 py-2 text-sm text-[#0f5c36]">
                <p data-testid="freebie">
                  Today’s freebie{" "}
                  <span className="font-mono tracking-wide">{formatCode(freebieCode)}</span>{" "}
                  was daubed when you logged in.
                </p>
                <button
                  type="button"
                  className="mt-1 font-medium underline underline-offset-2"
                  onClick={() => locate(freebieCode)}
                >
                  Show it
                </button>
              </div>
            ) : authenticatorLogin ? (
              <p className="mt-3 text-sm text-muted-foreground">
                The authenticator code you log in with is marked once each day.
              </p>
            ) : emailLogin ? (
              <p className="mt-3 text-sm text-muted-foreground">
                The code emailed to you at sign-in is marked once each day.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                A password on its own is not marked.
              </p>
            )}
            <SignInChoice
              sessionToken={sessionToken}
              factor={authenticatorLogin ? "authenticator" : emailLogin ? "email" : "password"}
              accountEmail={accountEmail}
            />
            <FocusReadout
              code={focusCode}
              onRegister={(delta) => {
                if (focusCode === null || zoom.level !== 2) return;
                registerCell(cellIndex(focusCode), delta);
              }}
            />
          </div>
        </aside>

        <div className="order-3 grid gap-4 lg:grid-cols-2">
          <div className="ticket rounded-2xl p-4">
            <Achievements />
          </div>
          <section className="ticket rounded-2xl p-4">
            <h2 className="font-heading text-xl text-[#14211b]">Recent</h2>
            {recent.length === 0 ? (
              <p className="mt-2 text-sm text-[#4d6156]">Codes you register show up here.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1">
                {recent.map((item) => (
                  <li key={item.code}>
                    <button
                      type="button"
                      onClick={() => locate(item.code)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left font-mono text-sm text-[#14211b] hover:bg-[#e7f3ea]"
                    >
                      <span>{formatCode(item.code)}</span>
                      <span className="text-[#4d6156]">
                        {item.count > 1 ? `${item.count}×` : "1×"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <RulesDialog />
              <Button type="button" variant="outline" onClick={exportCard}>
                Export
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
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
          </section>
        </div>
      </div>

      <StampOverlay title={stamp?.title ?? null} detail={stamp?.detail ?? null} onDone={clearStamp} />

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
            <Button type="button" variant="outline" onClick={() => setPendingImport(null)}>
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

function Crumb({
  children,
  current,
  onClick,
}: {
  children: string;
  current: boolean;
  onClick?: () => void;
}) {
  if (current || !onClick) {
    return (
      <span className="font-mono text-xs text-[#14211b]" aria-current="page">
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono text-xs text-[#1f7a45] underline-offset-2 hover:underline"
    >
      {children}
    </button>
  );
}

function FocusReadout({
  code,
  onRegister,
}: {
  code: number | null;
  onRegister: (delta: 1 | -1) => void;
}) {
  const count = useCount(code);
  if (code === null) {
    return (
      <p className="mt-4 text-sm text-muted-foreground" data-testid="active-square">
        Find a code, then click its square to register it.
      </p>
    );
  }
  return (
    <div className="mt-4 border-t border-[#c5d6c9] pt-4" data-testid="active-square">
      <p className="font-mono text-2xl tracking-[0.18em] text-[#14211b]">{formatCode(code)}</p>
      <p className="mt-1 text-sm text-[#4d6156]">{spanLabel(code - cellIndex(code), code - cellIndex(code) + 100)}</p>
      <p className="mt-1 font-mono text-sm text-[#146b43]">
        {count === 0 ? "Not registered yet" : count === 1 ? "Registered once" : `${count}×`}
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" onClick={() => onRegister(1)}>
          {count === 0 ? "Register" : "Register again"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={count === 0}
          onClick={() => onRegister(-1)}
        >
          Remove one
        </Button>
      </div>
    </div>
  );
}
