export type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";

export const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low", "Info"];

export type LanguageId =
  | "python"
  | "java"
  | "c"
  | "cpp"
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "sql";

export type ReviewMode = "full" | "security" | "performance" | "quick";
export type ExplanationLevel = "beginner" | "intermediate" | "advanced";

export interface Issue {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  line: number | null;
  description: string;
  impact: string;
  suggestion: string;
  fixed_code: string | null;
  /** "ai" = produced by Nemotron, "static" = produced by a static analysis tool */
  source: "ai" | "static";
  tool?: string | null;
  rule?: string | null;
}

export interface StaticFinding {
  tool: string;
  rule: string;
  message: string;
  severity: Severity;
  category: string;
  line: number | null;
}

export interface ToolStatus {
  tool: string;
  status: "ok" | "unavailable" | "failed" | "skipped";
  detail: string | null;
  findings: number;
}

export interface StaticMetrics {
  total_lines: number;
  code_lines: number;
  comment_lines: number;
  blank_lines: number;
  function_count: number | null;
  max_nesting_depth: number | null;
  cyclomatic_complexity: number | null;
  /** how the metrics were obtained: e.g. "radon", "python-ast", "heuristic" */
  source: string;
  functions?: { name: string; line: number; complexity: number; rank: string }[];
  maintainability_index?: number | null;
}

export interface Scores {
  readability: number;
  maintainability: number;
  efficiency: number;
  security: number;
}

export interface Complexity {
  time: string;
  space: string;
  explanation: string;
  optimization?: string | null;
}

export interface ReviewResponse {
  id: string;
  language: LanguageId;
  review_mode: ReviewMode;
  summary: string;
  quality_score: number;
  scores: Scores;
  complexity: Complexity;
  issues: Issue[];
  optimized_code: string | null;
  optimization_notes: string[];
  explanation: string;
  explanation_level: ExplanationLevel;
  recommendations: string[];
  static_analysis: {
    tools: ToolStatus[];
    findings: StaticFinding[];
    metrics: StaticMetrics;
  };
  meta: {
    duration_ms: number;
    model: string;
    analyzed_at: string;
    engine: string;
    lines: number;
  };
}

export interface ExplainResponse {
  explanation: string;
  level: ExplanationLevel;
}

export interface OptimizeResponse {
  optimized_code: string | null;
  notes: string[];
  summary: string;
}

export interface SecurityReviewResponse {
  summary: string;
  security_score: number;
  issues: Issue[];
  recommendations: string[];
  static_findings: StaticFinding[];
  tools: ToolStatus[];
  disclaimer: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  language: LanguageId;
  code: string;
  review: ReviewResponse;
}
