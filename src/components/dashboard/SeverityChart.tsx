"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SEVERITIES, type Issue } from "@/types/review";
import { SEVERITY_STYLES } from "@/components/ui/Badge";

export function SeverityChart({ issues }: { issues: Issue[] }) {
  const data = SEVERITIES.map((s) => ({
    name: s,
    count: issues.filter((i) => i.severity === s).length,
  }));
  if (issues.length === 0) return null;
  return (
    <div className="h-36 w-full" aria-label="Issues by severity">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: "var(--subtle)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--fg) 5%, transparent)" }}
            contentStyle={{
              background: "var(--panel-3)",
              border: "1px solid var(--line-strong)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--fg)",
            }}
            labelStyle={{ color: "var(--muted)" }}
            itemStyle={{ color: "var(--fg)" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((d) => (
              <Cell key={d.name} fill={SEVERITY_STYLES[d.name].hex} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
