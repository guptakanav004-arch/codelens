import { AlertTriangle, FileCode2, ShieldAlert, Sparkles } from "lucide-react";

const CODE: { t: string; c?: string; flag?: "high" | "med" }[][] = [
  [{ t: "def ", c: "text-[#c792ea]" }, { t: "get_user", c: "text-[#82aaff]" }, { t: "(db, username):" }],
  [{ t: "    conn = sqlite3." }, { t: "connect", c: "text-[#82aaff]" }, { t: "(db)" }],
  [{ t: "    query = " }, { t: "\"SELECT * FROM users WHERE name='\"", c: "text-[#c3e88d]" }, { t: " + username", flag: "high" }],
  [{ t: "    cur = conn." }, { t: "execute", c: "text-[#82aaff]" }, { t: "(query)" }],
  [{ t: "    return cur." }, { t: "fetchone", c: "text-[#82aaff]" }, { t: "()" }],
  [{ t: "" }],
  [{ t: "def ", c: "text-[#c792ea]" }, { t: "load_session", c: "text-[#82aaff]" }, { t: "(blob):" }],
  [{ t: "    return pickle." }, { t: "loads", c: "text-[#82aaff]" }, { t: "(blob)", flag: "med" }],
  [{ t: "" }],
  [{ t: "def ", c: "text-[#c792ea]" }, { t: "average", c: "text-[#82aaff]" }, { t: "(nums):" }],
  [{ t: "    return " }, { t: "sum", c: "text-[#82aaff]" }, { t: "(nums) / " }, { t: "len", c: "text-[#82aaff]" }, { t: "(nums)" }],
];

export function WorkspacePreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[40px] bg-accent/10 blur-3xl" />
      <div className="overflow-hidden rounded-xl border border-linestrong bg-panel shadow-2xl shadow-black/40">
        {/* title bar */}
        <div className="flex items-center gap-2 border-b border-line bg-panel2 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
          <span className="ml-3 flex items-center gap-1.5 text-xs text-muted">
            <FileCode2 className="h-3.5 w-3.5" /> user_service.py
          </span>
          <span className="ml-auto hidden rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white sm:inline">
            Analyze Code
          </span>
        </div>
        <div className="grid md:grid-cols-[1.35fr_1fr]">
          {/* editor */}
          <div className="border-b border-line bg-canvas p-4 font-mono text-[12px] leading-6 md:border-b-0 md:border-r">
            {CODE.map((line, i) => (
              <div
                key={i}
                className={`flex gap-4 whitespace-pre rounded-sm ${
                  line.some((s) => s.flag === "high") ? "bg-danger/10" : line.some((s) => s.flag === "med") ? "bg-warning/10" : ""
                }`}
              >
                <span className="w-4 select-none text-right text-subtle">{i + 1}</span>
                <span className="overflow-hidden text-fg/90">
                  {line.map((s, j) => (
                    <span key={j} className={s.c}>
                      {s.t}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
          {/* analysis */}
          <div className="space-y-3 bg-panel p-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--warning)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="97.4"
                    strokeDashoffset="34"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold">65</span>
              </div>
              <div>
                <p className="text-sm font-medium">Quality score</p>
                <p className="text-xs text-muted">3 issues · 1 high · 1 medium</p>
              </div>
            </div>
            <div className="rounded-lg border border-danger/25 bg-danger/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-danger">
                <ShieldAlert className="h-3.5 w-3.5" /> High · Line 3
              </div>
              <p className="mt-1 text-sm font-medium">SQL injection via string concatenation</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                User input is concatenated into the query. Use parameterized queries.
              </p>
            </div>
            <div className="rounded-lg border border-warning/25 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> Medium · Line 8
              </div>
              <p className="mt-1 text-sm font-medium">Unsafe deserialization with pickle</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-panel2 p-3 text-xs text-muted">
              <Sparkles className="h-3.5 w-3.5 text-accentstrong" />
              Complexity (AI estimate): <span className="font-mono text-fg">O(n)</span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-subtle">Illustrative preview of the workspace.</p>
    </div>
  );
}
