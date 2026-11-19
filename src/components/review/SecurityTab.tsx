"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { LanguageId, ReviewResponse, SecurityReviewResponse } from "@/types/review";
import { api, ApiClientError } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { IssueCard } from "@/components/review/IssueCard";

export const SECURITY_DISCLAIMER = "Security findings are automated suggestions and do not replace a professional security audit.";

export function SecurityTab({
  review,
  code,
  language,
  onGoToLine,
}: {
  review: ReviewResponse;
  code: string;
  language: LanguageId;
  onGoToLine: (line: number) => void;
}) {
  const [deep, setDeep] = useState<SecurityReviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const issues = review.issues.filter((i) => /secur|vulnerab/i.test(i.category));
  const securityTools = review.static_analysis.tools.filter((t) => ["bandit", "ruff", "eslint", "pattern-scan"].includes(t.tool));

  async function runDeep() {
    setLoading(true);
    try {
      setDeep(await api.securityReview({ code, language }));
      toast("Focused security review complete", "success");
    } catch (e) {
      toast(e instanceof ApiClientError ? e.message : "Security review failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-xs leading-relaxed text-muted">
        <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        {SECURITY_DISCLAIMER}
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-line bg-panel2/40 p-4">
        <ScoreRing score={deep?.security_score ?? review.scores.security} size={84} stroke={7} label="Security" />
        <div>
          <p className="text-sm font-semibold">
            {issues.length} security finding{issues.length === 1 ? "" : "s"} in this review
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The score is an AI estimate capped by detected issues. A high score does not mean the code is secure.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel2/40 p-4">
        <h3 className="mb-2 text-sm font-semibold">Security tooling</h3>
        <ul className="space-y-1.5 text-xs text-muted">
          {securityTools.map((t) => (
            <li key={t.tool} className="flex justify-between gap-3">
              <span className="font-mono text-fg">{t.tool}</span>
              <span className="text-right">{t.status === "ok" ? `${t.findings} finding${t.findings === 1 ? "" : "s"}` : t.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Findings</h3>
        {issues.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs leading-relaxed text-muted">
            No security issues were reported. That is not proof of safety, so consider a focused review below.
          </p>
        ) : (
          <div className="space-y-2">
            {issues.map((i) => (
              <IssueCard key={i.id} issue={i} onGoToLine={onGoToLine} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-line bg-panel2/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Focused security review</h3>
            <p className="mt-0.5 text-xs text-muted">Ask Nemotron for a dedicated security-only pass.</p>
          </div>
          <Button onClick={runDeep} disabled={loading} size="sm" variant="primary">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {deep ? "Run again" : "Run security review"}
          </Button>
        </div>
        {deep && (
          <div className="animate-fade-up mt-4 space-y-3 border-t border-line pt-4">
            <p className="text-sm leading-relaxed text-muted">{deep.summary}</p>
            {deep.issues.length > 0 ? (
              <div className="space-y-2">
                {deep.issues.map((i) => (
                  <IssueCard key={i.id} issue={i} onGoToLine={onGoToLine} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">The focused review reported no additional issues.</p>
            )}
            {deep.recommendations.length > 0 && (
              <ul className="space-y-1.5 text-sm text-muted">
                {deep.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
