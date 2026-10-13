"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GRID_SIZE, makeCode, pad2 } from "@/lib/codes";
import { daubStyle } from "@/lib/colors";
import { useCardStore } from "@/components/card-store";
import { Button } from "@/components/ui/button";

type Cell = { row: number; col: number };

function headerSize(cellSize: number) {
  return cellSize >= 16 ? 28 : 16;
}

function countLabel(count: number, size: number) {
  if (count < 2 || size < 20) return null;
  if (count > 99 && size < 36) return "99+";
  return `${count}×`;
}

export function MiniGrid({
  card,
  cursor,
  scrollNonce,
  onCursor,
  onHover,
  onDaub,
  pulseKey,
  pulseCode,
}: {
  card: number;
  cursor: Cell | null;
  scrollNonce: number;
  onCursor: (cell: Cell, scroll?: boolean) => void;
  onHover: (cell: Cell | null) => void;
  onDaub: (code: number, delta: 1 | -1) => void;
  pulseKey: number;
  pulseCode: number | null;
}) {
  const store = useCardStore();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef<Cell | null>(null);
  const cursorRef = useRef(cursor);
  const pulseRef = useRef<{ code: number; until: number } | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const [cellSize, setCellSize] = useState(28);
  const [view, setView] = useState({ w: 640, h: 480 });

  const header = headerSize(cellSize);
  const content = header + GRID_SIZE * cellSize;

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 2 || h < 2) return;
      setView((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    cursorRef.current = cursor;
    const draw = () => {
    const canvas = canvasRef.current;
    const scroller = scrollerRef.current;
    const width = scroller?.clientWidth || view.w;
    const height = scroller?.clientHeight || view.h;
    if (!canvas || !scroller || width < 2 || height < 2) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const scrollLeft = scroller.scrollLeft;
    const scrollTop = scroller.scrollTop;
    const size = cellSize;
    const gap = size >= 8 ? 1 : 0;
    const firstCol = Math.max(0, Math.floor((scrollLeft - header) / size));
    const lastCol = Math.min(
      GRID_SIZE - 1,
      Math.ceil((scrollLeft + width - header) / size),
    );
    const firstRow = Math.max(0, Math.floor((scrollTop - header) / size));
    const lastRow = Math.min(
      GRID_SIZE - 1,
      Math.ceil((scrollTop + height - header) / size),
    );

    ctx.fillStyle = "#e7dfd0";
    ctx.fillRect(0, 0, width, height);

    const fontSize = Math.max(9, Math.min(13, size * 0.42));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${fontSize}px ui-monospace, monospace`;

    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        const sx = header + col * size - scrollLeft;
        const sy = header + row * size - scrollTop;
        const code = card * 10_000 + row * 100 + col;
        const count = store.get(code);
        const style = daubStyle(count);
        ctx.fillStyle = style.background;
        ctx.fillRect(sx, sy, size - gap, size - gap);
        const label = countLabel(count, size);
        if (label) {
          ctx.fillStyle = style.color;
          ctx.fillText(label, sx + (size - gap) / 2, sy + (size - gap) / 2 + 0.5);
        }
      }
    }

    const ring = (cell: Cell, color: string, lineWidth: number) => {
      const sx = header + cell.col * size - scrollLeft;
      const sy = header + cell.row * size - scrollTop;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(sx + 1.5, sy + 1.5, size - gap - 3, size - gap - 3);
    };

    const hover = hoverRef.current;
    const active = cursorRef.current;
    if (
      hover &&
      (!active || hover.row !== active.row || hover.col !== active.col)
    ) {
      ring(hover, "#1c1712", size >= 16 ? 2 : 1);
    }
    if (active) ring(active, "#c5341a", size >= 16 ? 2 : 1);

    const pulse = pulseRef.current;
    if (pulse && performance.now() < pulse.until) {
      const pulseCard = Math.floor(pulse.code / 10_000);
      if (pulseCard === card) {
        const row = Math.floor((pulse.code % 10_000) / 100);
        const col = pulse.code % 100;
        ring({ row, col }, "#f4efe4", 3);
      }
    }

    ctx.fillStyle = "#f6f0e4";
    ctx.fillRect(0, 0, width, header);
    ctx.fillRect(0, 0, header, height);
    ctx.font = `500 ${header >= 26 ? 10 : 8}px ui-monospace, monospace`;
    ctx.fillStyle = "#6b6258";
    for (let col = firstCol; col <= lastCol; col++) {
      if (size < 14 && col % 10 !== 0) continue;
      const sx = header + col * size - scrollLeft;
      if (sx + size < header) continue;
      const marked =
        (active && active.col === col) || (hover && hover.col === col);
      ctx.fillStyle = marked ? "#1c1712" : "#6b6258";
      ctx.fillText(pad2(col), sx + size / 2, header / 2);
    }
    for (let row = firstRow; row <= lastRow; row++) {
      if (size < 14 && row % 10 !== 0) continue;
      const sy = header + row * size - scrollTop;
      if (sy + size < header) continue;
      const marked =
        (active && active.row === row) || (hover && hover.row === row);
      ctx.fillStyle = marked ? "#1c1712" : "#6b6258";
      ctx.fillText(pad2(row), header / 2, sy + size / 2);
    }
    ctx.fillStyle = "#efe6d4";
    ctx.fillRect(0, 0, header, header);
    ctx.strokeStyle = "#d9cbb3";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, header + 0.5);
    ctx.lineTo(width, header + 0.5);
    ctx.moveTo(header + 0.5, 0);
    ctx.lineTo(header + 0.5, height);
    ctx.stroke();
    };

    drawRef.current = draw;
    draw();
    return store.subscribe(() => {
      drawRef.current();
    });
  }, [store, card, cellSize, view, cursor, header]);

  const scrolledNonce = useRef(0);
  useEffect(() => {
    if (scrollNonce === 0 || scrollNonce === scrolledNonce.current || !cursor) return;
    const nonce = scrollNonce;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame = 0;
    const attempt = () => {
      if (scroller.clientHeight < 2 || scroller.clientWidth < 2) return;
      scrolledNonce.current = nonce;
      const left =
        header +
        cursor.col * cellSize -
        scroller.clientWidth / 2 +
        cellSize / 2;
      const top =
        header +
        cursor.row * cellSize -
        scroller.clientHeight / 2 +
        cellSize / 2;
      scroller.scrollTo({
        left: Math.max(0, left),
        top: Math.max(0, top),
        behavior: "smooth",
      });
      observer.disconnect();
    };
    const observer = new ResizeObserver(attempt);
    observer.observe(scroller);
    frame = requestAnimationFrame(attempt);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [scrollNonce, cursor, cellSize, header]);

  useEffect(() => {
    if (pulseCode == null) return;
    pulseRef.current = { code: pulseCode, until: performance.now() + 720 };
    let frame = 0;
    const tick = () => {
      drawRef.current();
      if (pulseRef.current && performance.now() < pulseRef.current.until) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pulseKey, pulseCode]);

  function cellFromEvent(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const scroller = scrollerRef.current;
    if (!canvas || !scroller) return null;
    const rect = canvas.getBoundingClientRect();
    const contentX = event.clientX - rect.left + scroller.scrollLeft;
    const contentY = event.clientY - rect.top + scroller.scrollTop;
    if (contentX < header || contentY < header) return null;
    const col = Math.floor((contentX - header) / cellSize);
    const row = Math.floor((contentY - header) / cellSize);
    if (row < 0 || col < 0 || row >= GRID_SIZE || col >= GRID_SIZE) return null;
    return { row, col };
  }

  function fitCard() {
    const el = scrollerRef.current;
    if (!el) return;
    const available = Math.min(el.clientWidth, el.clientHeight) - 16;
    setCellSize(Math.max(4, Math.floor(available / GRID_SIZE)));
  }

  return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e4dcc8] px-3 py-2">
        <p className="font-heading text-lg text-[#1c1712]">Card {pad2(card)}</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[#6e6458]">
            Square size
            <input
              type="range"
              min={6}
              max={48}
              step={2}
              value={Math.min(48, Math.max(6, cellSize))}
              onChange={(event) => setCellSize(Number(event.target.value))}
              className="accent-[#146b43]"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fitCard}
          >
            Whole card
          </Button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="application"
        aria-label={`Card ${pad2(card)}. 100 by 100 squares. Arrow keys move, Enter daubs, Shift+Enter removes one.`}
        onKeyDown={(event) => {
          if (
            event.key === "ArrowLeft" ||
            event.key === "ArrowRight" ||
            event.key === "ArrowUp" ||
            event.key === "ArrowDown"
          ) {
            event.preventDefault();
            if (!cursorRef.current) {
              onCursor({ row: 0, col: 0 }, true);
              return;
            }
            const current = cursorRef.current;
            onCursor(
              {
                row:
                  event.key === "ArrowUp"
                    ? Math.max(0, current.row - 1)
                    : event.key === "ArrowDown"
                      ? Math.min(99, current.row + 1)
                      : current.row,
                col:
                  event.key === "ArrowLeft"
                    ? Math.max(0, current.col - 1)
                    : event.key === "ArrowRight"
                      ? Math.min(99, current.col + 1)
                      : current.col,
              },
              true,
            );
          } else if (event.key === "Enter" && cursorRef.current) {
            event.preventDefault();
            onDaub(
              makeCode(card, cursorRef.current.row, cursorRef.current.col),
              event.shiftKey ? -1 : 1,
            );
          }
        }}
        onScroll={() => drawRef.current()}
        className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-[#e7dfd0] outline-none focus-visible:ring-2 focus-visible:ring-[#146b43] focus-visible:ring-inset"
      >
        <div style={{ width: content, height: content }}>
          <canvas
            ref={canvasRef}
            className="sticky top-0 left-0 cursor-pointer"
            style={{ width: view.w, height: view.h }}
            onMouseMove={(event) => {
              const cell = cellFromEvent(event);
              const prev = hoverRef.current;
              if (prev?.row === cell?.row && prev?.col === cell?.col) return;
              hoverRef.current = cell;
              onHover(cell);
              drawRef.current();
            }}
            onMouseLeave={() => {
              hoverRef.current = null;
              onHover(null);
              drawRef.current();
            }}
            onMouseDown={() => scrollerRef.current?.focus({ preventScroll: true })}
            onClick={(event) => {
              const cell = cellFromEvent(event);
              if (!cell) return;
              onCursor(cell);
              onDaub(makeCode(card, cell.row, cell.col), 1);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              const cell = cellFromEvent(event);
              if (!cell) return;
              onCursor(cell);
              onDaub(makeCode(card, cell.row, cell.col), -1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
