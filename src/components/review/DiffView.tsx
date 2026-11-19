"use client";

import { useMemo } from "react";
import { diffLines } from "diff";

interface Row {
  kind: "add" | "del" | "same";
  text: string;
  oldNo: number | null;
  newNo: number | null;
}

export function DiffView({ original, modified }: { original: string; modified: string }) {
  const { rows, added, removed } = useMemo(() => {
    const parts = diffLines(original, modified);
    const out: Row[] = [];
    let o = 1;
    let n = 1;
    let a = 0;
    let r = 0;
    for (const p of parts) {
      const lines = p.value.replace(/\n$/, "").split("\n");
      for (const text of lines) {
        if (p.added) {
          out.push({ kind: "add", text, oldNo: null, newNo: n++ });
          a++;
        } else if (p.removed) {
          out.push({ kind: "del", text, oldNo: o++, newNo: null });
          r++;
        } else out.push({ kind: "same", text, oldNo: o++, newNo: n++ });
      }
    }
    return { rows: out, added: a, removed: r };
  }, [original, modified]);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-canvas">
      <div className="flex items-center gap-3 border-b border-line px-3 py-1.5 text-[11px]">
        <span className="text-success">+{added}</span>
        <span className="text-danger">−{removed}</span>
        <span className="text-subtle">lines changed</span>
      </div>
      <div className="max-h-[420px] overflow-auto font-mono text-xs leading-5">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={r.kind === "add" ? "bg-success/10" : r.kind === "del" ? "bg-danger/10" : ""}
              >
                <td className="w-8 select-none px-2 text-right text-subtle">{r.oldNo ?? ""}</td>
                <td className="w-8 select-none px-2 text-right text-subtle">{r.newNo ?? ""}</td>
                <td className={`w-4 select-none text-center ${r.kind === "add" ? "text-success" : r.kind === "del" ? "text-danger" : "text-subtle"}`}>
                  {r.kind === "add" ? "+" : r.kind === "del" ? "−" : ""}
                </td>
                <td className="whitespace-pre pr-4 text-fg/90">{r.text || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
