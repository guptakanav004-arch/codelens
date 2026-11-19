"use client";

import { useState } from "react";
import { BookOpen, Bug, FileSearch, Gauge, LayoutDashboard, Maximize2, Minimize2, ShieldCheck, Sparkles } from "lucide-react";
import type { LanguageId, ReviewResponse } from "@/types/review";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { AnalysisLoading } from "@/components/review/AnalysisLoading";
import { ErrorState } from "@/components/review/ErrorState";
import { OverviewTab } from "@/components/review/OverviewTab";
import { IssuesTab } from "@/components/review/IssuesTab";
import { ExplanationTab } from "@/components/review/ExplanationTab";
import { OptimizationTab } from "@/components/review/OptimizationTab";
import { SecurityTab } from "@/components/review/SecurityTab";
import { ComplexityTab } from "@/components/review/ComplexityTab";

export type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; code: string; message: string }
  | { status: "success"; review: ReviewResponse; analyzedCode: string; language: LanguageId };

type TabId = "overview" | "issues" | "explain" | "optimize" | "security" | "complexity";

export function ResultsPanel({
  state,
  onAnalyze,
  onGoToLine,
  onReplace,
  expanded,
  onToggleExpand,
}: {
  state: AnalysisState;
  onAnalyze: () => void;
  onGoToLine: (line: number) => void;
  onReplace: (code: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [tab, setTab] = useState<TabId>("overview");

  const items: TabItem<TabId>[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    {
      id: "issues",
      label: "Issues",
      icon: <Bug className="h-3.5 w-3.5" />,
      count: state.status === "success" ? state.review.issues.length : undefined,
    },
    { id: "explain", label: "Explain", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "optimize", label: "Optimize", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "security", label: "Security", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { id: "complexity", label: "Complexity", icon: <Gauge className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-2">
        <div className="min-w-0 flex-1">
          <Tabs items={items} value={tab} onChange={setTab} label="Review sections" />
        </div>
        <Tooltip label={expanded ? "Collapse panel" : "Expand panel"}>
          <button
            onClick={onToggleExpand}
            aria-label={expanded ? "Collapse results panel" : "Expand results panel"}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-panel2 hover:text-fg lg:inline-flex"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.status === "loading" && <AnalysisLoading />}
        {state.status === "error" && <ErrorState code={state.code} message={state.message} onRetry={onAnalyze} />}
        {state.status === "idle" && (
          <div className="flex h-full flex-col items-center justify-center px-8 py-14 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel2 text-accentstrong">
              <FileSearch className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold">No review yet</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
              Paste or upload code, or load a sample, then run an analysis. Results, explanations and an optimized version will
              appear here.
            </p>
            <Button variant="primary" className="mt-5" onClick={onAnalyze}>
              Analyze Code
            </Button>
          </div>
        )}
        {state.status === "success" && (
          <div className={`animate-fade-up p-4 ${expanded ? "mx-auto max-w-3xl" : ""}`}>
            {tab === "overview" && <OverviewTab review={state.review} />}
            {tab === "issues" && <IssuesTab issues={state.review.issues} onGoToLine={onGoToLine} />}
            {tab === "explain" && (
              <ExplanationTab key={state.review.id} review={state.review} code={state.analyzedCode} language={state.language} />
            )}
            {tab === "optimize" && (
              <OptimizationTab
                key={state.review.id}
                review={state.review}
                originalCode={state.analyzedCode}
                language={state.language}
                onReplace={onReplace}
              />
            )}
            {tab === "security" && (
              <SecurityTab key={state.review.id} review={state.review} code={state.analyzedCode} language={state.language} onGoToLine={onGoToLine} />
            )}
            {tab === "complexity" && <ComplexityTab review={state.review} />}
          </div>
        )}
      </div>
    </div>
  );
}
