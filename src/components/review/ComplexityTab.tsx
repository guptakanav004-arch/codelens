import { Cpu, Ruler } from "lucide-react";
import type { ReviewResponse } from "@/types/review";

function Metric({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2.5">
      <p className="font-mono text-base font-semibold tabular-nums">{value ?? "—"}</p>
      <p className="mt-0.5 text-[11px] text-subtle">{label}</p>
    </div>
  );
}

export function ComplexityTab({ review }: { review: ReviewResponse }) {
  const m = review.static_analysis.metrics;
  const measuredByTool = m.source === "radon" || m.source === "python-ast";
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-panel2/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Ruler className="h-4 w-4 text-success" /> Static analysis metrics
          </h3>
          <span className="rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success">
            {measuredByTool ? `Measured · ${m.source}` : "Heuristic count"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric label="Total lines" value={m.total_lines} />
          <Metric label="Code lines" value={m.code_lines} />
          <Metric label="Comment lines" value={m.comment_lines} />
          <Metric label="Functions" value={m.function_count} />
          <Metric label="Max nesting depth" value={m.max_nesting_depth} />
          <Metric label={m.source === "radon" ? "Cyclomatic (total)" : "Cyclomatic (approx.)"} value={m.cyclomatic_complexity} />
          {typeof m.maintainability_index === "number" && <Metric label="Maintainability index" value={m.maintainability_index} />}
        </div>
        {!measuredByTool && (
          <p className="mt-3 text-[11px] leading-relaxed text-subtle">
            These values come from simple pattern counting, not a verified complexity tool. Python complexity is measured with
            Radon when the Python backend is running.
          </p>
        )}
        {m.functions && m.functions.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-panel text-subtle">
                <tr>
                  <th className="px-3 py-2 font-medium">Function</th>
                  <th className="px-3 py-2 font-medium">Line</th>
                  <th className="px-3 py-2 font-medium">CC</th>
                  <th className="px-3 py-2 font-medium">Rank</th>
                </tr>
              </thead>
              <tbody>
                {m.functions.map((f) => (
                  <tr key={`${f.name}-${f.line}`} className="border-t border-line">
                    <td className="px-3 py-2 font-mono">{f.name}</td>
                    <td className="px-3 py-2 tabular-nums text-muted">{f.line}</td>
                    <td className="px-3 py-2 tabular-nums">{f.complexity}</td>
                    <td className="px-3 py-2">
                      <span className={f.rank <= "B" ? "text-success" : f.rank === "C" ? "text-warning" : "text-danger"}>{f.rank}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-panel2/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Cpu className="h-4 w-4 text-accentstrong" /> Algorithmic complexity
          </h3>
          <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accentstrong">AI estimate</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-line bg-panel px-3 py-3">
            <p className="text-[11px] uppercase tracking-wider text-subtle">Time</p>
            <p className="mt-1 font-mono text-lg font-semibold">{review.complexity.time}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel px-3 py-3">
            <p className="text-[11px] uppercase tracking-wider text-subtle">Space</p>
            <p className="mt-1 font-mono text-lg font-semibold">{review.complexity.space}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{review.complexity.explanation}</p>
        {review.complexity.optimization && (
          <div className="mt-3 rounded-lg border border-line bg-panel px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">Possible optimization</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{review.complexity.optimization}</p>
          </div>
        )}
        <p className="mt-3 text-[11px] text-subtle">Big-O values are estimates by the AI model and have not been independently verified.</p>
      </section>
    </div>
  );
}
