import type { ReactNode } from "react";

/** Lightweight CSS tooltip: shows on hover and keyboard focus of the wrapped element. */
export function Tooltip({
  label,
  children,
  side = "bottom",
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
}) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-linestrong bg-panel3 px-2 py-1 text-[11px] text-fg opacity-0 shadow-lg transition delay-300 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100 ${
          side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
