"use client";

import {
  createContext,
  use,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { analyze, type Analysis } from "@/lib/bingo";

type Listener = () => void;

export class CardStore {
  counts: Map<number, number>;
  version = 0;
  private listeners = new Set<Listener>();
  private cached: Analysis | null = null;
  private cachedVersion = -1;

  constructor(entries: [number, number][]) {
    this.counts = new Map(entries.filter(([, count]) => count > 0));
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  get(code: number) {
    return this.counts.get(code) ?? 0;
  }

  set(code: number, count: number) {
    if (count <= 0) this.counts.delete(code);
    else this.counts.set(code, count);
    this.version += 1;
    this.cached = null;
    for (const listener of this.listeners) listener();
  }

  hydrate(entries: [number, number][]) {
    this.counts = new Map(entries.filter(([, count]) => count > 0));
    this.version += 1;
    this.cached = null;
    for (const listener of this.listeners) listener();
  }

  entries(): [number, number][] {
    return [...this.counts.entries()].sort((a, b) => a[0] - b[0]);
  }

  getAnalysis(): Analysis {
    if (!this.cached || this.cachedVersion !== this.version) {
      this.cached = analyze(this.counts);
      this.cachedVersion = this.version;
    }
    return this.cached;
  }
}

const CardStoreContext = createContext<CardStore | null>(null);

export function CardStoreProvider({
  store,
  children,
}: {
  store: CardStore;
  children: ReactNode;
}) {
  return (
    <CardStoreContext.Provider value={store}>{children}</CardStoreContext.Provider>
  );
}

export function useCardStore() {
  const store = use(CardStoreContext);
  if (!store) throw new Error("Card store missing");
  return store;
}

export function useAnalysis() {
  const store = useCardStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.getAnalysis(),
    () => store.getAnalysis(),
  );
}

export function useCount(code: number | null) {
  const store = useCardStore();
  return useSyncExternalStore(
    store.subscribe,
    () => (code === null ? 0 : store.get(code)),
    () => (code === null ? 0 : store.get(code)),
  );
}
