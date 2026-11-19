import type { Issue } from "@/types/review";
import { formatDuration } from "@/utils/format";

export function StatGrid({ issues, durationMs }: { issues: Issue[]; durationMs: number }) {
  const n = (s: string) => issues.filter((i) => i.severity === s).length;
  const stats = [
    { label: "Total issues", value: issues.length, tone: "" },
    { label: "Critical", value: n("Critical"), tone: n("Critical") ? "text-danger" : "" },
    { label: "High", value: n("High"), tone: n("High") ? "text-orange" : "" },
    { label: "Medium", value: n("Medium"), tone: n("Medium") ? "text-warning" : "" },
    { label: "Low", value: n("Low"), tone: n("Low") ? "text-info" : "" },
    { label: "Duration", value: formatDuration(durationMs), tone: "" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-line bg-panel2/60 px-3 py-2.5">
          <p className={`text-lg font-semibold tabular-nums leading-tight ${s.tone}`}>{s.value}</p>
          <p className="mt-0.5 text-[11px] text-subtle">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
