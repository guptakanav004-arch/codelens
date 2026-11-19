"use client";

import type { ReactNode } from "react";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = "underline",
  label,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: "underline" | "pill";
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-1 overflow-x-auto ${variant === "underline" ? "border-b border-line px-2" : ""}`}
    >
      {items.map((t) => {
        const active = t.id === value;
        const base = "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium transition";
        const cls =
          variant === "underline"
            ? `${base} -mb-px border-b-2 px-3 py-2.5 ${
                active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
              }`
            : `${base} rounded-md px-2.5 py-1.5 ${
                active ? "bg-panel3 text-fg" : "text-muted hover:bg-panel2 hover:text-fg"
              }`;
        return (
          <button key={t.id} role="tab" aria-selected={active} onClick={() => onChange(t.id)} className={cls}>
            {t.icon}
            {t.label}
            {typeof t.count === "number" && (
              <span className="rounded bg-panel3 px-1.5 text-[10px] tabular-nums text-muted">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
