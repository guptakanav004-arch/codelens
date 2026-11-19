"use client";

import { useCallback, useEffect, useState } from "react";
import type { HistoryEntry, LanguageId, ReviewResponse } from "@/types/review";

const KEY = "codelens-history-v1";
const MAX = 25;

function read(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // storage full: drop the oldest half and retry once
    try {
      localStorage.setItem(KEY, JSON.stringify(entries.slice(0, Math.ceil(entries.length / 2))));
    } catch {
      /* ignore */
    }
  }
}

/** Review history stored locally in the browser (no account or database required). */
export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(read());
    setLoaded(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setEntries(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((code: string, language: LanguageId, review: ReviewResponse) => {
    const entry: HistoryEntry = { id: review.id, createdAt: review.meta.analyzed_at, language, code, review };
    const next = [entry, ...read().filter((e) => e.id !== entry.id)].slice(0, MAX);
    write(next);
    setEntries(next);
  }, []);

  const remove = useCallback((id: string) => {
    const next = read().filter((e) => e.id !== id);
    write(next);
    setEntries(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setEntries([]);
  }, []);

  return { entries, loaded, add, remove, clear };
}
