"use client";

import Link from "next/link";
import { useState } from "react";
import { History, Trash2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LinkButton, Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { Skeleton } from "@/components/ui/Skeleton";
import { useHistory } from "@/hooks/useHistory";
import { getLanguage } from "@/utils/languages";
import { formatDuration, timeAgo } from "@/utils/format";

export default function HistoryPage() {
  const { entries, loaded, remove, clear } = useHistory();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-4xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Review history</h1>
            <p className="mt-1.5 text-sm text-muted">Saved locally in this browser. Nothing is uploaded or stored on a server.</p>
          </div>
          {entries.length > 0 &&
            (confirmClear ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">Delete all reviews?</span>
                <Button size="sm" variant="danger" onClick={() => { clear(); setConfirmClear(false); }}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </Button>
            ))}
        </div>

        <div className="mt-8 space-y-3">
          {!loaded && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          {loaded && entries.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-line px-6 py-16 text-center">
              <History className="h-6 w-6 text-subtle" />
              <h2 className="mt-4 text-sm font-semibold">No reviews yet</h2>
              <p className="mt-1.5 max-w-xs text-sm text-muted">Run your first analysis in the workspace and it will be saved here.</p>
              <LinkButton href="/workspace" variant="primary" className="mt-5">
                Open Workspace
              </LinkButton>
            </div>
          )}
          {entries.map((e) => (
            <div key={e.id} className="group flex items-center gap-4 rounded-xl border border-line bg-panel p-4 transition hover:border-linestrong">
              <ScoreRing score={e.review.quality_score} size={56} stroke={5} />
              <Link href={`/workspace?review=${e.id}`} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{getLanguage(e.language).label} review</span>
                  <Pill>{e.review.issues.length} issues</Pill>
                  <Pill>{e.review.meta.lines} lines</Pill>
                  <Pill>{formatDuration(e.review.meta.duration_ms)}</Pill>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{e.review.summary}</p>
                <p className="mt-1 text-[11px] text-subtle">{timeAgo(e.createdAt)} · {e.review.meta.model}</p>
              </Link>
              <button
                onClick={() => remove(e.id)}
                aria-label="Delete review"
                className="rounded-md p-2 text-subtle transition hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
