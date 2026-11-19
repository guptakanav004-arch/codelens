import { z } from "zod";
import { ApiError } from "./errors";
import { SEVERITIES, type Severity } from "@/types/review";

/** Remove reasoning blocks and markdown fences that models sometimes add. */
export function stripWrappers(text: string): string {
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  t = t.replace(/^[\s\S]*?<\/think>/i, ""); // dangling closing tag
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].includes("{")) t = fence[1];
  return t.trim();
}

/** Extract the first balanced top-level JSON object, respecting strings. */
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null; // unbalanced: truncated response
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    // controlled recovery: remove trailing commas and raw control characters
    const repaired = s.replace(/,\s*([}\]])/g, "$1").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
    return JSON.parse(repaired);
  }
}

export function parseModelJson(raw: string): unknown {
  const cleaned = stripWrappers(raw);
  const obj = extractJsonObject(cleaned);
  if (!obj) {
    throw new ApiError(
      502,
      "ai_malformed_response",
      "The AI returned an incomplete or non-JSON response (it may have been truncated). Please try again.",
    );
  }
  try {
    return tryParse(obj);
  } catch {
    throw new ApiError(502, "ai_malformed_response", "The AI returned malformed JSON that could not be recovered. Please try again.");
  }
}

// ---------------------------------------------------------------- lenient normalisers
function normalizeSeverity(v: unknown): Severity {
  const s = String(v ?? "").trim().toLowerCase();
  const found = SEVERITIES.find((x) => x.toLowerCase() === s);
  if (found) return found;
  if (s === "major" || s === "error") return "High";
  if (s === "minor" || s === "warning") return "Medium";
  if (s === "informational" || s === "note" || s === "suggestion") return "Info";
  return "Low";
}

function toScore(v: unknown): number | null {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

const optStr = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const obj = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export interface ParsedIssue {
  title: string;
  category: string;
  severity: Severity;
  line: number | null;
  description: string;
  impact: string;
  suggestion: string;
  fixed_code: string | null;
}

/** Normalise issues individually so one bad item does not discard the whole review. */
export function validateIssues(items: unknown[]): ParsedIssue[] {
  const out: ParsedIssue[] = [];
  for (const item of items) {
    const r = obj(item);
    const title = optStr(r.title);
    if (!title) continue;
    const lineRaw = typeof r.line === "string" ? Number(r.line) : r.line;
    out.push({
      title,
      category: optStr(r.category)?.trim() ?? "Quality",
      severity: normalizeSeverity(r.severity),
      line: typeof lineRaw === "number" && Number.isInteger(lineRaw) && lineRaw > 0 ? lineRaw : null,
      description: str(r.description),
      impact: str(r.impact),
      suggestion: str(r.suggestion),
      fixed_code: optStr(r.fixed_code),
    });
  }
  return out;
}

// ---------------------------------------------------------------- structural schemas (Zod)
// Zod verifies the required structure; the transform then normalises optional fields leniently.
export const ReviewSchema = z
  .object({
    summary: z.string().min(1),
    issues: z.array(z.unknown()),
    quality_score: z.unknown().optional(),
    scores: z.unknown().optional(),
    complexity: z.unknown().optional(),
    optimized_code: z.unknown().optional(),
    optimization_notes: z.unknown().optional(),
    explanation: z.unknown().optional(),
    recommendations: z.unknown().optional(),
  })
  .transform((d) => {
    const s = obj(d.scores);
    const c = obj(d.complexity);
    return {
      summary: d.summary,
      issues: d.issues,
      quality_score: toScore(d.quality_score),
      scores: {
        readability: toScore(s.readability),
        maintainability: toScore(s.maintainability),
        efficiency: toScore(s.efficiency),
        security: toScore(s.security),
      },
      complexity: { time: str(c.time), space: str(c.space), explanation: str(c.explanation), optimization: optStr(c.optimization) },
      optimized_code: optStr(d.optimized_code),
      optimization_notes: strList(d.optimization_notes),
      explanation: str(d.explanation),
      recommendations: strList(d.recommendations),
    };
  });

export const ExplainSchema = z.object({ explanation: z.string().min(1) });

export const OptimizeSchema = z
  .object({
    optimized_code: z.string().min(1),
    summary: z.unknown().optional(),
    notes: z.unknown().optional(),
  })
  .transform((d) => ({ optimized_code: d.optimized_code, summary: str(d.summary), notes: strList(d.notes) }));

export const SecuritySchema = z
  .object({
    summary: z.string().min(1),
    issues: z.array(z.unknown()),
    security_score: z.unknown().optional(),
    recommendations: z.unknown().optional(),
  })
  .transform((d) => ({
    summary: d.summary,
    issues: d.issues,
    security_score: toScore(d.security_score),
    recommendations: strList(d.recommendations),
  }));

export function validateOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    console.error(
      "[codelens] AI response failed validation:",
      r.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`),
    );
    throw new ApiError(502, "ai_malformed_response", "The AI response was incomplete or did not match the expected structure. Please try again.");
  }
  return r.data;
}
