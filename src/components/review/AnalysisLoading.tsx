"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

export const STAGES = [
  "Validating source code",
  "Running static analysis",
  "Analysing with Nemotron",
  "Preparing review",
  "Generating report",
];

/**
 * The backend exposes a single request, so real per-stage progress is not measurable.
 * Stages advance on a timer and are shown as indicative processing states only.
 */
export function AnalysisLoading() {
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // validation + static analysis are quick; the model call dominates, so stay on stage 3 until done
    const delays = [600, 1800, 12000, 9000];
    if (stage >= STAGES.length - 1) return;
    const t = setTimeout(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), delays[stage] ?? 8000);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div className="space-y-5 p-4" role="status" aria-live="polite">
      <div className="rounded-xl border border-line bg-panel2/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Analysing your code</h3>
          <span className="font-mono text-xs tabular-nums text-subtle">{elapsed}s</span>
        </div>
        <ol className="space-y-2.5">
          {STAGES.map((label, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <li key={label} className={`flex items-center gap-2.5 text-sm transition ${done ? "text-muted" : active ? "text-fg" : "text-subtle"}`}>
                <span className="flex h-4 w-4 items-center justify-center">
                  {done ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : active ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accentstrong" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-subtle/50" />
                  )}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11px] text-subtle">Stages are indicative processing states, not measured progress.</p>
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-line bg-panel2/40 p-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
