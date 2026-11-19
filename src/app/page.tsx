import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";
import { WorkspacePreview } from "@/components/landing/WorkspacePreview";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <section id="product" className="relative overflow-hidden pb-20 pt-20 md:pt-28">
          <div className="hero-glow absolute inset-0 -z-10" />
          <div className="bg-grid absolute inset-0 -z-10" />
          <div className="mx-auto max-w-4xl px-5 text-center">
            <Link
              href="/about"
              className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1 text-xs text-muted transition hover:border-linestrong hover:text-fg"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Powered by NVIDIA Nemotron + static analysis
              <ArrowRight className="h-3 w-3" />
            </Link>
            <h1 className="animate-fade-up mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl" style={{ animationDelay: "60ms" }}>
              <span className="gradient-text">Write Better Code.</span>
              <br />
              <span className="gradient-text">Catch Bugs Before They Ship.</span>
            </h1>
            <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "120ms" }}>
              AI-powered code reviews that detect issues, explain your code, uncover vulnerabilities, and help you write
              cleaner software.
            </p>
            <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
              <LinkButton href="/workspace" variant="primary" size="lg">
                Start Reviewing <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/#features" variant="secondary" size="lg">
                Explore Features
              </LinkButton>
            </div>
          </div>
          <div className="animate-fade-up mt-16 px-5" style={{ animationDelay: "260ms" }}>
            <WorkspacePreview />
          </div>
        </section>
        <Features />
        <HowItWorks />
        <section className="border-t border-line/70 py-20">
          <div className="mx-auto max-w-2xl px-5 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Review your first file in under a minute</h2>
            <p className="mt-3 text-muted">Load a sample with realistic bugs, or paste your own code.</p>
            <LinkButton href="/workspace" variant="primary" size="lg" className="mt-7">
              Launch Workspace <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
