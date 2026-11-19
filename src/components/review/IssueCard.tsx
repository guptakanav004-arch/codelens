"use client";

import { useState } from "react";
import { ChevronDown, Cpu, Crosshair, Wrench } from "lucide-react";
import type { Issue } from "@/types/review";
import { Pill, SeverityBadge, SEVERITY_STYLES } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";

export function IssueCard({
  issue,
  onGoToLine,
  defaultOpen = false,
}: {
  issue: Issue;
  onGoToLine?: (line: number) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const s = SEVERITY_STYLES[issue.severity];
  return (
    <div className={`overflow-hidden rounded-lg border bg-panel2/40 transition ${open ? "border-linestrong" : "border-line hover:border-linestrong"}`}>
      <div className="flex items-start gap-2 pr-2">
        <button
          className="flex min-w-0 flex-1 items-start gap-3 px-3.5 py-3 text-left"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium leading-snug">{issue.title}</span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <SeverityBadge severity={issue.severity} />
              <Pill>{issue.category}</Pill>
              <Pill>
                {issue.source === "ai" ? <Cpu className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                {issue.source === "ai" ? "AI" : issue.tool ?? "static"}
              </Pill>
            </span>
          </span>
          <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-subtle transition ${open ? "rotate-180" : ""}`} />
        </button>
        {issue.line !== null && onGoToLine && (
          <button
            onClick={() => onGoToLine(issue.line as number)}
            className="mt-2.5 inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-line bg-panel px-2 font-mono text-[11px] text-accentstrong transition hover:border-accent/50 hover:bg-accent/10"
            title="Go to line in editor"
          >
            <Crosshair className="h-3 w-3" />L{issue.line}
          </button>
        )}
        {issue.line !== null && !onGoToLine && (
          <span className="mt-3 shrink-0 font-mono text-[11px] text-muted">L{issue.line}</span>
        )}
      </div>
      {open && (
        <div className="animate-fade-up space-y-3.5 border-t border-line px-4 py-3.5 text-sm">
          {issue.description && (
            <Section title="What's wrong">
              <p className="leading-relaxed text-muted">{issue.description}</p>
            </Section>
          )}
          {issue.impact && (
            <Section title="Why it matters">
              <p className="leading-relaxed text-muted">{issue.impact}</p>
            </Section>
          )}
          {issue.suggestion && (
            <Section title="Suggested fix">
              <p className="leading-relaxed text-muted">{issue.suggestion}</p>
            </Section>
          )}
          {issue.fixed_code && (
            <div className="overflow-hidden rounded-md border border-line bg-canvas">
              <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
                <span className="text-[11px] text-subtle">Suggested code</span>
                <CopyButton text={issue.fixed_code} iconOnly label="Copy suggested code" />
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-fg/90">{issue.fixed_code}</pre>
            </div>
          )}
          {issue.line === null && <p className="text-[11px] text-subtle">Line number could not be determined.</p>}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-subtle">{title}</p>
      {children}
    </div>
  );
}
