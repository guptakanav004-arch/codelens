const STEPS = [
  { n: "01", title: "Paste or upload your code", body: "Drop in a snippet or upload a source file. Nine languages are supported." },
  { n: "02", title: "CodeLens runs static analysis", body: "Linters and security scanners produce verified findings. Your code is never executed." },
  { n: "03", title: "Nemotron AI analyses the code", body: "The model receives your code as untrusted data, plus the static findings, and returns a structured review." },
  { n: "04", title: "View your review", body: "Explore scores, issues, explanations, complexity and an optimized version you can diff and apply." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-line/70 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accentstrong">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">From paste to report in four steps</h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative">
              {i < STEPS.length - 1 && (
                <span className="absolute left-10 right-[-1.5rem] top-[18px] hidden h-px bg-gradient-to-r from-linestrong to-transparent md:block" />
              )}
              <span className="relative inline-flex h-9 items-center rounded-lg border border-line bg-panel2 px-2.5 font-mono text-xs text-accentstrong">
                {s.n}
              </span>
              <h3 className="mt-4 text-[15px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
