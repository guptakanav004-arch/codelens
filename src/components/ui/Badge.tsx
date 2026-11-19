import type { ReactNode } from "react";
import type { Severity } from "@/types/review";

export const SEVERITY_STYLES: Record<Severity, { text: string; bg: string; border: string; dot: string; hex: string }> = {
  Critical: { text: "text-danger", bg: "bg-danger/10", border: "border-danger/30", dot: "bg-danger", hex: "#d8605f" },
  High: { text: "text-orange", bg: "bg-orange/10", border: "border-orange/30", dot: "bg-orange", hex: "#d9824a" },
  Medium: { text: "text-warning", bg: "bg-warning/10", border: "border-warning/30", dot: "bg-warning", hex: "#d9a441" },
  Low: { text: "text-info", bg: "bg-info/10", border: "border-info/30", dot: "bg-info", hex: "#5b9bd5" },
  Info: { text: "text-muted", bg: "bg-panel3", border: "border-line", dot: "bg-subtle", hex: "#6b6b7b" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${s.text} ${s.bg} ${s.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {severity}
    </span>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-0.5 text-[11px] font-medium text-muted ${className}`}
    >
      {children}
    </span>
  );
}
