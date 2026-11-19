import { CheckCircle2, Info, MinusCircle, TriangleAlert, XCircle } from "lucide-react";
import type { ReviewResponse } from "@/types/review";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { ScoreBars } from "@/components/dashboard/ScoreBars";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { SeverityChart } from "@/components/dashboard/SeverityChart";

const STATUS_ICON = {
  ok: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  unavailable: <MinusCircle className="h-3.5 w-3.5 text-subtle" />,
  failed: <XCircle className="h-3.5 w-3.5 text-danger" />,
  skipped: <MinusCircle className="h-3.5 w-3.5 text-subtle" />,
};

export function OverviewTab({ review }: { review: ReviewResponse }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5 rounded-xl border border-line bg-panel2/40 p-4">
        <ScoreRing score={review.quality_score} label="Quality" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Overall code quality</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{review.summary}</p>
        </div>
      </div>

      <StatGrid issues={review.issues} durationMs={review.meta.duration_ms} />

      <div className="rounded-xl border border-line bg-panel2/40 p-4">
        <h3 className="mb-4 text-sm font-semibold">Quality scores</h3>
        <ScoreBars scores={review.scores} />
        <p className="mt-4 flex gap-2 text-[11px] leading-relaxed text-subtle">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Scores are AI-generated estimates, adjusted downward when serious findings exist. They are not universally objective
          measurements.
        </p>
      </div>

      {review.issues.length > 0 && (
        <div className="rounded-xl border border-line bg-panel2/40 p-4">
          <h3 className="mb-2 text-sm font-semibold">Issues by severity</h3>
          <SeverityChart issues={review.issues} />
        </div>
      )}

      {review.recommendations.length > 0 && (
        <div className="rounded-xl border border-line bg-panel2/40 p-4">
          <h3 className="mb-3 text-sm font-semibold">Recommendations</h3>
          <ul className="space-y-2">
            {review.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-line bg-panel2/40 p-4">
        <h3 className="mb-3 text-sm font-semibold">Analysis pipeline</h3>
        <ul className="space-y-2">
          {review.static_analysis.tools.map((t) => (
            <li key={t.tool} className="flex items-start gap-2.5 text-xs">
              <span className="mt-0.5">{STATUS_ICON[t.status]}</span>
              <span className="min-w-0 flex-1">
                <span className="font-mono text-fg">{t.tool}</span>
                <span className="ml-2 text-subtle">{t.status === "ok" ? `${t.findings} finding${t.findings === 1 ? "" : "s"}` : t.status}</span>
                {t.detail && <span className="mt-0.5 block text-subtle">{t.detail}</span>}
              </span>
            </li>
          ))}
          <li className="flex items-start gap-2.5 text-xs">
            <span className="mt-0.5">
              <TriangleAlert className="h-3.5 w-3.5 text-accentstrong" />
            </span>
            <span className="text-subtle">
              <span className="font-mono text-fg">{review.meta.model}</span> · AI review · engine {review.meta.engine}
            </span>
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-subtle">Your code was analysed statically and was never executed.</p>
      </div>
    </div>
  );
}
