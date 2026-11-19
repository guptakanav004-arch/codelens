"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { SEVERITIES, type Issue, type Severity } from "@/types/review";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { IssueCard } from "@/components/review/IssueCard";

type Filter = "All" | Severity;

export function IssuesTab({ issues, onGoToLine }: { issues: Issue[]; onGoToLine: (line: number) => void }) {
  const [filter, setFilter] = useState<Filter>("All");

  const items: TabItem<Filter>[] = useMemo(
    () => [
      { id: "All", label: "All Issues", count: issues.length },
      ...SEVERITIES.map((s) => ({ id: s as Filter, label: s, count: issues.filter((i) => i.severity === s).length })),
    ],
    [issues],
  );
  const visible = filter === "All" ? issues : issues.filter((i) => i.severity === filter);

  return (
    <div className="space-y-3">
      <Tabs items={items} value={filter} onChange={setFilter} variant="pill" label="Filter issues by severity" />
      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <p className="mt-3 text-sm font-medium">
            {filter === "All" ? "No issues were reported" : `No ${filter.toLowerCase()} severity issues`}
          </p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
            This does not guarantee the code is correct or secure. Automated review can miss problems.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onGoToLine={onGoToLine} />
          ))}
        </div>
      )}
    </div>
  );
}
