import type { Scores } from "@/types/review";
import { scoreColor } from "@/utils/format";

const LABELS: { key: keyof Scores; label: string }[] = [
  { key: "readability", label: "Readability" },
  { key: "maintainability", label: "Maintainability" },
  { key: "efficiency", label: "Efficiency" },
  { key: "security", label: "Security" },
];

export function ScoreBars({ scores }: { scores: Scores }) {
  return (
    <div className="space-y-3.5">
      {LABELS.map(({ key, label }) => (
        <div key={key}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted">{label}</span>
            <span className="font-medium tabular-nums">{scores[key]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-panel3" role="progressbar" aria-valuenow={scores[key]} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <div
              className="h-full rounded-full"
              style={{ width: `${scores[key]}%`, background: scoreColor(scores[key]), transition: "width 0.9s cubic-bezier(.2,.8,.2,1)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
