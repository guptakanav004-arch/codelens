"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Info, Plus, Settings, Trash2, X } from "lucide-react";
import type { HistoryEntry } from "@/types/review";
import { getLanguage } from "@/utils/languages";
import { timeAgo } from "@/utils/format";
import { api } from "@/services/api";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export interface EditorSettings {
  fontSize: number;
  wordWrap: boolean;
  autoDetect: boolean;
}

function scoreDot(score: number): string {
  return score >= 80 ? "bg-success" : score >= 60 ? "bg-warning" : "bg-danger";
}

export function WorkspaceSidebar({
  entries,
  activeId,
  onNew,
  onOpen,
  onRemove,
  settings,
  onSettings,
  onClose,
}: {
  entries: HistoryEntry[];
  activeId: string | null;
  onNew: () => void;
  onOpen: (e: HistoryEntry) => void;
  onRemove: (id: string) => void;
  settings: EditorSettings;
  onSettings: (s: EditorSettings) => void;
  onClose?: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; engine?: string; ai_configured?: boolean; model?: string } | null>(null);

  useEffect(() => {
    if (!showSettings) return;
    api.health().then(setHealth);
  }, [showSettings]);

  const row = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-panel2 hover:text-fg";

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Workspace</span>
        {onClose && (
          <button onClick={onClose} aria-label="Close sidebar" className="rounded-md p-1 text-muted hover:bg-panel2 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="px-2">
        <button onClick={onNew} className={`${row} border border-line bg-panel2 !text-fg hover:border-linestrong`}>
          <Plus className="h-4 w-4 text-accentstrong" /> New Review
        </button>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col px-2">
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
            <History className="h-3 w-3" /> Recent Reviews
          </span>
          <Link href="/history" className="text-[11px] text-muted hover:text-fg">
            View all
          </Link>
        </div>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {entries.length === 0 && (
            <p className="px-2.5 py-3 text-xs leading-relaxed text-subtle">
              Completed reviews are saved in this browser and will show up here.
            </p>
          )}
          {entries.slice(0, 12).map((e) => (
            <div
              key={e.id}
              className={`group flex items-center rounded-lg transition ${activeId === e.id ? "bg-panel3" : "hover:bg-panel2"}`}
            >
              <button onClick={() => onOpen(e)} className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left">
                <span className={`h-2 w-2 shrink-0 rounded-full ${scoreDot(e.review.quality_score)}`} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-fg">
                    {getLanguage(e.language).label} · {e.review.quality_score}/100
                  </span>
                  <span className="block truncate text-[11px] text-subtle">
                    {e.review.issues.length} issues · {timeAgo(e.createdAt)}
                  </span>
                </span>
              </button>
              <button
                onClick={() => onRemove(e.id)}
                aria-label="Delete review"
                className="mr-1.5 rounded p-1 text-subtle opacity-0 transition hover:text-danger focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line p-2">
        <button onClick={() => setShowSettings((s) => !s)} className={row} aria-expanded={showSettings}>
          <Settings className="h-4 w-4" /> Settings
        </button>
        {showSettings && (
          <div className="animate-fade-up mx-1 mb-2 space-y-3 rounded-lg border border-line bg-panel2 p-3 text-xs">
            <label className="flex items-center justify-between">
              <span className="text-muted">Font size</span>
              <select
                value={settings.fontSize}
                onChange={(e) => onSettings({ ...settings, fontSize: Number(e.target.value) })}
                className="rounded-md border border-line bg-panel px-1.5 py-1 text-fg outline-none"
              >
                {[12, 13, 14, 16].map((n) => (
                  <option key={n} value={n}>
                    {n}px
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-muted">Word wrap</span>
              <input type="checkbox" checked={settings.wordWrap} onChange={(e) => onSettings({ ...settings, wordWrap: e.target.checked })} className="accent-[var(--accent)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-muted">Auto-detect language</span>
              <input type="checkbox" checked={settings.autoDetect} onChange={(e) => onSettings({ ...settings, autoDetect: e.target.checked })} className="accent-[var(--accent)]" />
            </label>
            <div className="flex items-center justify-between">
              <span className="text-muted">Theme</span>
              <ThemeToggle />
            </div>
            <div className="border-t border-line pt-2.5 text-[11px] leading-relaxed text-subtle">
              <p className="mb-1 font-medium text-muted">Backend status</p>
              {!health && "Checking…"}
              {health && !health.ok && <span className="text-danger">Backend unreachable</span>}
              {health?.ok && (
                <>
                  <p>
                    Engine: <span className="text-fg">{health.engine}</span>
                  </p>
                  <p>
                    Nemotron API:{" "}
                    <span className={health.ai_configured ? "text-success" : "text-warning"}>
                      {health.ai_configured ? "configured" : "not configured"}
                    </span>
                  </p>
                  {health.model && <p className="truncate">Model: {health.model}</p>}
                </>
              )}
            </div>
          </div>
        )}
        <Link href="/about" className={row}>
          <Info className="h-4 w-4" /> About
        </Link>
      </div>
    </aside>
  );
}
