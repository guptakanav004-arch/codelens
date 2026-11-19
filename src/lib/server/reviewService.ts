import { randomUUID } from "node:crypto";
import { getConfig } from "./config";
import type { CodeRequest } from "./http";
import { callNemotronJson } from "./nemotron";
import {
  ExplainSchema,
  OptimizeSchema,
  ReviewSchema,
  SecuritySchema,
  validateIssues,
  validateOrThrow,
  type ParsedIssue,
} from "./parser";
import {
  SYSTEM_PROMPT,
  buildExplainPrompt,
  buildOptimizePrompt,
  buildReviewPrompt,
  buildSecurityPrompt,
  makeNonce,
} from "./prompts";
import { reconcileScores, sortIssues } from "./scoring";
import { runStaticAnalysis } from "./staticAnalysis";
import type {
  ExplainResponse,
  Issue,
  OptimizeResponse,
  ReviewResponse,
  SecurityReviewResponse,
  StaticFinding,
} from "@/types/review";

const DISCLAIMER = "Security findings are automated suggestions and do not replace a professional security audit.";

function toAiIssues(parsed: ParsedIssue[], totalLines: number): Issue[] {
  return parsed.map((p, idx) => ({
    id: `ai-${idx + 1}`,
    title: p.title,
    category: p.category,
    severity: p.severity,
    // never trust model line numbers blindly: drop anything outside the file
    line: p.line !== null && p.line <= totalLines ? p.line : null,
    description: p.description,
    impact: p.impact,
    suggestion: p.suggestion,
    fixed_code: p.fixed_code,
    source: "ai" as const,
    tool: "nemotron",
    rule: null,
  }));
}

function staticToIssues(findings: StaticFinding[], existing: Issue[]): Issue[] {
  const out: Issue[] = [];
  findings.forEach((f, idx) => {
    const duplicate = existing.some(
      (e) => e.line !== null && e.line === f.line && e.category.toLowerCase() === f.category.toLowerCase(),
    );
    if (duplicate) return;
    out.push({
      id: `static-${idx + 1}`,
      title: f.message.replace(/\.$/, ""),
      category: f.category,
      severity: f.severity,
      line: f.line,
      description: f.message,
      impact: "Reported by automated static analysis. Verify in context; static tools can produce false positives.",
      suggestion: "",
      fixed_code: null,
      source: "static",
      tool: f.tool,
      rule: f.rule,
    });
  });
  return out;
}

export async function runReview(req: CodeRequest): Promise<ReviewResponse> {
  const started = Date.now();
  const { code, language, review_mode, explanation_level } = req;
  const lines = code.split("\n").length;

  const staticResult = runStaticAnalysis(code, language);
  const nonce = makeNonce();
  const raw = await callNemotronJson(
    SYSTEM_PROMPT,
    buildReviewPrompt({
      code,
      language,
      mode: review_mode,
      level: explanation_level,
      findings: staticResult.findings,
      nonce,
    }),
  );
  const parsed = validateOrThrow(ReviewSchema, raw);

  const aiIssues = toAiIssues(validateIssues(parsed.issues), lines);
  const issues = sortIssues([...aiIssues, ...staticToIssues(staticResult.findings, aiIssues)]);
  const { quality_score, scores } = reconcileScores(
    { ...parsed.scores, quality: parsed.quality_score },
    issues,
  );

  return {
    id: randomUUID(),
    language,
    review_mode,
    summary: parsed.summary,
    quality_score,
    scores,
    complexity: {
      time: parsed.complexity?.time || "Unknown",
      space: parsed.complexity?.space || "Unknown",
      explanation: parsed.complexity?.explanation || "The model did not provide a complexity explanation.",
      optimization: parsed.complexity?.optimization ?? null,
    },
    issues,
    optimized_code: parsed.optimized_code ?? null,
    optimization_notes: parsed.optimization_notes ?? [],
    explanation: parsed.explanation || "",
    explanation_level,
    recommendations: parsed.recommendations ?? [],
    static_analysis: staticResult,
    meta: {
      duration_ms: Date.now() - started,
      model: getConfig().model,
      analyzed_at: new Date().toISOString(),
      engine: "builtin-ts",
      lines,
    },
  };
}

export async function runExplain(req: CodeRequest): Promise<ExplainResponse> {
  const raw = await callNemotronJson(
    SYSTEM_PROMPT,
    buildExplainPrompt({ code: req.code, language: req.language, level: req.explanation_level, nonce: makeNonce() }),
  );
  const parsed = validateOrThrow(ExplainSchema, raw);
  return { explanation: parsed.explanation, level: req.explanation_level };
}

export async function runOptimize(req: CodeRequest): Promise<OptimizeResponse> {
  const findings = runStaticAnalysis(req.code, req.language).findings;
  const raw = await callNemotronJson(
    SYSTEM_PROMPT,
    buildOptimizePrompt({ code: req.code, language: req.language, findings, nonce: makeNonce() }),
  );
  const parsed = validateOrThrow(OptimizeSchema, raw);
  return {
    optimized_code: parsed.optimized_code,
    notes: parsed.notes ?? [],
    summary: parsed.summary ?? "",
  };
}

export async function runSecurityReview(req: CodeRequest): Promise<SecurityReviewResponse> {
  const lines = req.code.split("\n").length;
  const staticResult = runStaticAnalysis(req.code, req.language);
  const raw = await callNemotronJson(
    SYSTEM_PROMPT,
    buildSecurityPrompt({ code: req.code, language: req.language, findings: staticResult.findings, nonce: makeNonce() }),
  );
  const parsed = validateOrThrow(SecuritySchema, raw);
  const aiIssues = toAiIssues(validateIssues(parsed.issues), lines).map((i) => ({ ...i, category: "Security" }));
  const issues = sortIssues(aiIssues);
  const { scores } = reconcileScores({ security: parsed.security_score }, issues);
  return {
    summary: parsed.summary,
    security_score: scores.security,
    issues,
    recommendations: parsed.recommendations ?? [],
    static_findings: staticResult.findings.filter((f) => /secur/i.test(f.category)),
    tools: staticResult.tools,
    disclaimer: DISCLAIMER,
  };
}
