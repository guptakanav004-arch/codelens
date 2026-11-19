import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "About — CodeLens AI" };

const PIPELINE = [
  { t: "Validate", d: "Request is validated: non-empty, size-limited, supported language, no binary content." },
  { t: "Static analysis", d: "Applicable tools run on the code without executing it: Ruff, Bandit, Radon and the Python AST for Python; ESLint for JS/TS; a rule-based pattern scanner for every language." },
  { t: "Nemotron review", d: "Source code is sent as untrusted data inside random delimiters, with static findings and a strict JSON schema." },
  { t: "Validate & merge", d: "The model's JSON is parsed and validated (Pydantic). Invalid line numbers are dropped, and static findings are merged with AI findings." },
  { t: "Score & report", d: "Scores are reconciled with verified findings so serious issues cannot hide behind an optimistic estimate." },
];

const LIMITS = [
  "AI output can be wrong or incomplete. Always review suggestions before applying them.",
  "Complexity (Big-O) and quality scores from the model are estimates, not verified measurements.",
  "Static analysis depth varies: Python has the deepest coverage, other languages rely on pattern scanning and AI.",
  "Security findings are automated suggestions and do not replace a professional security audit.",
  "Code is never executed or tested by CodeLens. Optimized code is not compiled or verified.",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-xs font-medium uppercase tracking-widest text-accentstrong">About</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">How CodeLens AI works</h1>
        <p className="mt-4 leading-relaxed text-muted">
          CodeLens AI is a college mini-project exploring how large language models can assist human code review. It pairs
          deterministic static analysis with the NVIDIA Nemotron model, and keeps the two clearly separated so you always know
          which findings were measured and which were estimated.
        </p>

        <h2 className="mt-12 text-lg font-semibold">The review pipeline</h2>
        <ol className="mt-5 space-y-4">
          {PIPELINE.map((s, i) => (
            <li key={s.t} className="flex gap-4 rounded-xl border border-line bg-panel p-4">
              <span className="font-mono text-xs text-accentstrong">0{i + 1}</span>
              <div>
                <h3 className="text-sm font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-lg font-semibold">Safety design</h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
          <li>• Submitted code is treated as untrusted data; instructions embedded in comments or strings are ignored.</li>
          <li>• Code is never executed on the server.</li>
          <li>• The NVIDIA API key lives only on the server and is never exposed to the browser.</li>
          <li>• If the AI is unavailable, CodeLens shows an error instead of fabricating a review.</li>
        </ul>

        <h2 className="mt-12 text-lg font-semibold">Limitations</h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
          {LIMITS.map((l) => (
            <li key={l}>• {l}</li>
          ))}
        </ul>

        <h2 className="mt-12 text-lg font-semibold">Technology</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          React, TypeScript, Tailwind CSS, Monaco Editor, Recharts, Lucide and Axios on the frontend. FastAPI, Pydantic and
          Uvicorn on the Python backend, with Ruff, Bandit, Radon, ESLint and the Python AST for analysis.
        </p>

        <LinkButton href="/workspace" variant="primary" size="lg" className="mt-12">
          Launch Workspace <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </main>
      <Footer />
    </div>
  );
}
