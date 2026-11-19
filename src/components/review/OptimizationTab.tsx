"use client";

import { useState } from "react";
import { Download, Loader2, Replace, Sparkles } from "lucide-react";
import type { LanguageId, ReviewResponse } from "@/types/review";
import { api, ApiClientError } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { DiffView } from "@/components/review/DiffView";
import { downloadText } from "@/utils/format";
import { getLanguage } from "@/utils/languages";

type View = "diff" | "optimized" | "original";

export function OptimizationTab({
  review,
  originalCode,
  language,
  onReplace,
}: {
  review: ReviewResponse;
  originalCode: string;
  language: LanguageId;
  onReplace: (code: string) => void;
}) {
  const [generated, setGenerated] = useState<{ code: string; notes: string[]; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("diff");
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();

  const optimized = generated?.code ?? review.optimized_code;
  const notes = generated?.notes ?? review.optimization_notes;

  async function generate() {
    setLoading(true);
    try {
      const res = await api.optimize({ code: originalCode, language });
      if (!res.optimized_code) throw new ApiClientError("empty", "The AI did not return optimized code.", null);
      setGenerated({ code: res.optimized_code, notes: res.notes, summary: res.summary });
      toast("Optimized version generated", "success");
    } catch (e) {
      toast(e instanceof ApiClientError ? e.message : "Optimization failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!optimized) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
        <Sparkles className="h-6 w-6 text-accentstrong" />
        <p className="mt-3 text-sm font-medium">No optimized version in this review</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
          The model did not provide an improved version. You can request a dedicated optimization pass.
        </p>
        <Button variant="primary" className="mt-5" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate optimized code
        </Button>
      </div>
    );
  }

  const ext = getLanguage(language).ext;
  const unchanged = optimized.trim() === originalCode.trim();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          items={[
            { id: "diff", label: "Diff" },
            { id: "optimized", label: "Optimized" },
            { id: "original", label: "Original" },
          ]}
          value={view}
          onChange={setView}
          variant="pill"
          label="Code view"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <CopyButton text={optimized} label="Copy" />
          <button
            onClick={() => downloadText(`optimized.${ext}`, optimized)}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-panel2 px-2 text-[11px] font-medium text-muted transition hover:border-linestrong hover:text-fg"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <Button size="sm" variant="primary" onClick={() => setConfirming(true)} className="!h-7">
            <Replace className="h-3.5 w-3.5" /> Replace editor code
          </Button>
        </div>
      </div>

      {confirming && (
        <div className="animate-fade-up flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-3.5 py-3 text-xs">
          <p className="text-muted">Replace the code in the editor with the optimized version? You can undo with Ctrl/Cmd+Z.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onReplace(optimized);
                setConfirming(false);
                toast("Editor updated with optimized code", "success");
              }}
            >
              Replace
            </Button>
          </div>
        </div>
      )}

      {unchanged && <p className="rounded-lg border border-line bg-panel2/40 px-3 py-2 text-xs text-muted">The optimized code is identical to your original.</p>}

      {view === "diff" && <DiffView original={originalCode} modified={optimized} />}
      {view !== "diff" && (
        <pre className="max-h-[480px] overflow-auto rounded-lg border border-line bg-canvas p-3 font-mono text-xs leading-5 text-fg/90">
          {view === "optimized" ? optimized : originalCode}
        </pre>
      )}

      {generated?.summary && <p className="text-sm leading-relaxed text-muted">{generated.summary}</p>}

      <div className="rounded-xl border border-line bg-panel2/40 p-4">
        <h3 className="mb-3 text-sm font-semibold">What changed and why</h3>
        {notes.length > 0 ? (
          <ul className="space-y-2">
            {notes.map((n, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {n}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">The model did not itemize its changes. Review the diff above.</p>
        )}
        <p className="mt-3 text-[11px] text-subtle">
          AI-suggested code has not been compiled or tested. Review it and run your own tests before using it.
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Regenerate with dedicated pass
        </Button>
      </div>
    </div>
  );
}
