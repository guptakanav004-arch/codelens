import type { Issue, Scores, Severity } from "@/types/review";

const PENALTY: Record<Severity, number> = { Critical: 25, High: 15, Medium: 7, Low: 3, Info: 0 };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };

function penaltyFor(issues: Issue[], pred: (i: Issue) => boolean): number {
  return issues.filter(pred).reduce((n, i) => n + PENALTY[i.severity], 0);
}

/**
 * Combine the model's self-reported scores with the verified issue list.
 * The model scores are estimates; we only use deterministic rules to (a) fill gaps
 * and (b) prevent a clean-looking score when serious findings exist.
 */
export function reconcileScores(
  ai: Partial<Record<keyof Scores | "quality", number | null | undefined>>,
  issues: Issue[],
): { quality_score: number; scores: Scores } {
  const isSec = (i: Issue) => /secur|vulnerab/i.test(i.category);
  const isPerf = (i: Issue) => /perf|effic/i.test(i.category);
  const isMaint = (i: Issue) => /maint|quality|readab|smell/i.test(i.category);

  const scores: Scores = {
    readability: ai.readability ?? clamp(100 - penaltyFor(issues, isMaint) * 0.8 - penaltyFor(issues, (i) => !isSec(i) && !isPerf(i) && !isMaint(i)) * 0.4),
    maintainability: ai.maintainability ?? clamp(100 - penaltyFor(issues, isMaint) - penaltyFor(issues, (i) => !isSec(i) && !isPerf(i) && !isMaint(i)) * 0.5),
    efficiency: ai.efficiency ?? clamp(100 - penaltyFor(issues, isPerf) * 1.2),
    security: ai.security ?? clamp(100 - penaltyFor(issues, isSec) * 1.2),
  };

  // Sanity caps: serious findings must be reflected in the numbers.
  const secIssues = issues.filter(isSec);
  if (secIssues.some((i) => i.severity === "Critical")) scores.security = Math.min(scores.security, 35);
  else if (secIssues.some((i) => i.severity === "High")) scores.security = Math.min(scores.security, 60);
  else if (secIssues.some((i) => i.severity === "Medium")) scores.security = Math.min(scores.security, 80);

  const mean = (scores.readability + scores.maintainability + scores.efficiency + scores.security) / 4;
  let quality = ai.quality ?? mean;
  if (issues.some((i) => i.severity === "Critical")) quality = Math.min(quality, 55);
  else if (issues.some((i) => i.severity === "High")) quality = Math.min(quality, 75);
  else if (issues.some((i) => i.severity === "Medium")) quality = Math.min(quality, 90);

  return { quality_score: clamp(quality), scores };
}

export function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (a.line ?? 1e9) - (b.line ?? 1e9),
  );
}
