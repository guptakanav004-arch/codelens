import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-line bg-panel/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            An AI-assisted code review platform combining static analysis with the NVIDIA Nemotron model.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle">About CodeLens AI</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-fg" href="/about">How it works</Link></li>
            <li><Link className="hover:text-fg" href="/workspace">Workspace</Link></li>
            <li><Link className="hover:text-fg" href="/history">Review history</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle">Technology</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>React · TypeScript · Tailwind</li>
            <li>Monaco Editor · Recharts</li>
            <li>FastAPI · Pydantic · Uvicorn</li>
            <li>Ruff · Bandit · Radon · ESLint</li>
            <li>NVIDIA Nemotron</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle">Project</h4>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Built as a college mini-project exploring AI-assisted software engineering tools.
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs leading-relaxed text-subtle md:flex-row md:justify-between">
          <p>
            <strong className="font-medium text-muted">Privacy:</strong> submitted code is sent to the backend and to the
            NVIDIA API for analysis. It is never executed. Reviews are stored only in your browser. Do not submit secrets or
            confidential code.
          </p>
          <p className="shrink-0">AI output is advisory and may be inaccurate. © {new Date().getFullYear()} CodeLens AI</p>
        </div>
      </div>
    </footer>
  );
}
