"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { logoutAction, touchSessionAction } from "@/app/actions/auth";
import { daubManyAction, reloadMarksAction } from "@/app/actions/marks";
import { celebrate } from "@/lib/celebrate";
import { lineFill } from "@/lib/lines";
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
import { DisplayName } from "@/components/display-name";
import { RulesDialog } from "@/components/rules-dialog";
import { StampOverlay } from "@/components/stamp-overlay";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
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
  initialMarks,
  initialRecent,
}: {
  username: string;
  sessionToken: string;
  initialMarks: [number, number][];
  initialRecent: Recent[];
}) {
  const [store] = useState(() => new CardStore(initialMarks));
  return (
    <CardStoreProvider store={store}>
      <BoardShell username={username} sessionToken={sessionToken} initialRecent={initialRecent} />
    </CardStoreProvider>
  );
}

function BoardShell({
  username,
  sessionToken,
  initialRecent,
}: {
  username: string;
  sessionToken: string;
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
  const linesRef = useRef<Uint8Array | null>(null);

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
        return next.slice(0, 20);
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
    const beforeLines = linesRef.current;
    const afterLines = lineFill(store.counts);
    previous.current = analysis;
    linesRef.current = afterLines;
    if (!before || !beforeLines || silent.current) {
      silent.current = false;
      return;
    }
    for (const event of celebrate(before, analysis, beforeLines, afterLines)) {
      toast.success(event.headline, {
        description: event.bar,
        duration: 12000,
        action: {
          label: "Share",
          onClick: () => {
            void shareProgress(event.text);
          },
        },
      });
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
  }, [analysis, store]);

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

  function selectCell(index: number) {
    if (zoom.level !== 2) return;
    setZoom({ ...zoom, focus: cellCode(zoom.block, zoom.page, index) });
  }

  function registerCell(index: number, delta: 1 | -1) {
    if (zoom.level !== 2) return;
    const code = cellCode(zoom.block, zoom.page, index);
    setZoom({ ...zoom, focus: code });
    persist([{ code, delta }]);
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
          <DisplayName username={username} sessionToken={sessionToken} />
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
                  ? "Select a number, then + adds one. Another mark makes it darker."
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
            onSelect={selectCell}
            onRemove={(index) => registerCell(index, -1)}
          />
          <p className="mt-3 text-xs text-[#4d6156]">
            {zoom.level === 2
              ? "Click a number to select it. + adds one, − takes one back."
              : "Pale green is a start. Deep green means that square is full."}
          </p>
        </section>

        <aside className="order-1 flex flex-col gap-4 lg:order-1">
          <div className="ticket rounded-2xl p-4">
            <CodeEntry onFind={onFind} />
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
            <h2 className="font-heading text-xl text-[#14211b]">Last 20</h2>
            {recent.length === 0 ? (
              <p className="mt-2 text-sm text-[#4d6156]">Codes you register show up here.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-4 gap-1.5" data-testid="recent-grid">
                {recent.map((item) => (
                  <li key={item.code}>
                    <button
                      type="button"
                      onClick={() => locate(item.code)}
                      aria-label={`${formatCode(item.code)}, registered ${item.count} ${item.count === 1 ? "time" : "times"}`}
                      className="flex w-full flex-col items-center rounded-lg bg-[#e7f3ea] px-1 py-2 text-center font-mono hover:bg-[#d5eadc]"
                    >
                      <span className="text-sm tracking-tight text-[#14211b]">{formatCode(item.code)}</span>
                      <span className="mt-0.5 text-xs text-[#4d6156]">{item.count}×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <RulesDialog />
            </div>
          </section>
        </div>
      </div>

      <StampOverlay title={stamp?.title ?? null} detail={stamp?.detail ?? null} onDone={clearStamp} />
    </div>
  );
}

async function shareProgress(text: string) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied. Paste it wherever you like.");
  } catch {
    toast.error("Couldn’t copy that.");
  }
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
  if (code === null) return null;
  return (
    <div className="mt-4 border-t border-[#c5d6c9] pt-4" data-testid="active-square">
      <p className="font-mono text-2xl tracking-[0.18em] text-[#14211b]">{formatCode(code)}</p>
      <p className="mt-1 text-sm text-[#4d6156]">{spanLabel(code - cellIndex(code), code - cellIndex(code) + 100)}</p>
      <div className="mt-3 flex items-center gap-2" data-testid="count-stepper">
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Take one back"
          data-testid="count-minus"
          disabled={count === 0}
          onClick={() => onRegister(-1)}
        >
          −
        </Button>
        <span className="min-w-10 text-center font-mono text-xl text-[#14211b]" data-testid="count-value">
          {count}
        </span>
        <Button
          type="button"
          size="icon"
          aria-label="Add one"
          data-testid="count-plus"
          onClick={() => onRegister(1)}
        >
          +
        </Button>
      </div>
    </div>
  );
}
