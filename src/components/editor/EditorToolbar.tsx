"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileCode2, Loader2, Play, Trash2, Upload } from "lucide-react";
import type { LanguageId, ReviewMode } from "@/types/review";
import { LANGUAGES, getLanguage } from "@/utils/languages";
import { SAMPLES, type Sample } from "@/utils/samples";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";

const MODES: { id: ReviewMode; label: string }[] = [
  { id: "full", label: "Full review" },
  { id: "security", label: "Security focus" },
  { id: "performance", label: "Performance focus" },
  { id: "quick", label: "Quick scan" },
];

export function EditorToolbar({
  language,
  onLanguageChange,
  mode,
  onModeChange,
  autoDetected,
  onUpload,
  onSample,
  onClear,
  onAnalyze,
  analyzing,
  canClear,
}: {
  language: LanguageId;
  onLanguageChange: (l: LanguageId) => void;
  mode: ReviewMode;
  onModeChange: (m: ReviewMode) => void;
  autoDetected: boolean;
  onUpload: (file: File) => void;
  onSample: (s: Sample) => void;
  onClear: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  canClear: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sampleOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setSampleOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSampleOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [sampleOpen]);

  const selectCls =
    "h-8 appearance-none rounded-lg border border-line bg-panel2 pl-2.5 pr-7 text-xs font-medium text-fg outline-none transition hover:border-linestrong focus:border-accent";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">
      <Tooltip label={getLanguage(language).analysis}>
        <div className="relative">
          <select
            aria-label="Language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as LanguageId)}
            className={selectCls}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3 w-3 text-subtle" />
        </div>
      </Tooltip>
      {autoDetected && <span className="hidden text-[11px] text-subtle sm:inline">auto-detected</span>}

      <div className="relative hidden sm:block">
        <select aria-label="Review mode" value={mode} onChange={(e) => onModeChange(e.target.value as ReviewMode)} className={selectCls}>
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3 w-3 text-subtle" />
      </div>

      <span className="mx-1 hidden h-5 w-px bg-line md:block" />

      <input
        ref={fileRef}
        type="file"
        hidden
        accept=".py,.java,.c,.h,.cpp,.cc,.cxx,.hpp,.js,.jsx,.mjs,.ts,.tsx,.html,.htm,.css,.sql,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <Tooltip label="Upload a source file (or drag & drop onto the editor)">
        <Button size="sm" onClick={() => fileRef.current?.click()} aria-label="Upload file">
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Upload</span>
        </Button>
      </Tooltip>

      <div className="relative" ref={menuRef}>
        <Button size="sm" onClick={() => setSampleOpen((o) => !o)} aria-haspopup="menu" aria-expanded={sampleOpen}>
          <FileCode2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Samples</span>
          <ChevronDown className="h-3 w-3 text-subtle" />
        </Button>
        {sampleOpen && (
          <div
            role="menu"
            className="animate-fade-up absolute left-0 top-full z-40 mt-1.5 w-72 overflow-hidden rounded-xl border border-linestrong bg-panel2 p-1 shadow-2xl shadow-black/40"
          >
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                role="menuitem"
                onClick={() => {
                  onSample(s);
                  setSampleOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-panel3"
              >
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="block text-[11px] text-muted">{s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Tooltip label="Clear editor">
        <Button size="sm" variant="ghost" onClick={onClear} disabled={!canClear} aria-label="Clear code">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Clear</span>
        </Button>
      </Tooltip>

      <div className="ml-auto">
        <Tooltip label="Ctrl/⌘ + Enter">
          <Button variant="primary" size="sm" onClick={onAnalyze} disabled={analyzing}>
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            {analyzing ? "Analyzing…" : "Analyze Code"}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
