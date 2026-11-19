import { Bug, Gauge, GraduationCap, ListChecks, ShieldCheck, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Bug,
    title: "Intelligent Bug Detection",
    body: "Finds logic errors, off-by-one mistakes, unhandled edge cases and likely runtime failures, with the exact line when it can be determined.",
  },
  {
    icon: ShieldCheck,
    title: "Security Analysis",
    body: "Bandit and pattern-based scanning plus AI review for injection, hardcoded secrets, unsafe deserialization and dangerous functions.",
  },
  {
    icon: Zap,
    title: "Code Optimization",
    body: "Get an improved version of your code with a side-by-side diff. Copy, download or apply it — nothing is overwritten automatically.",
  },
  {
    icon: Gauge,
    title: "Complexity Analysis",
    body: "Radon-measured cyclomatic complexity for Python, with AI time and space estimates clearly labelled as estimates.",
  },
  {
    icon: GraduationCap,
    title: "AI Code Explanation",
    body: "Understand any snippet at beginner, intermediate or advanced depth, generated from your actual code.",
  },
  {
    icon: ListChecks,
    title: "Code Quality Scoring",
    body: "Readability, maintainability, efficiency and security scores that are adjusted by verified findings, not just model opinion.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-line/70 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accentstrong">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">A reviewer that reads the whole file</h2>
          <p className="mt-3 text-muted">
            Static analysis gives the model verified signals. The model adds the judgement that rules cannot.
          </p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group bg-canvas p-6 transition hover:bg-panel">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel2 text-accentstrong transition group-hover:border-accent/40">
                <f.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
