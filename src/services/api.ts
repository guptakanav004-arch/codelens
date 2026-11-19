import axios, { AxiosError } from "axios";
import type {
  ApiErrorBody,
  ExplainResponse,
  ExplanationLevel,
  LanguageId,
  OptimizeResponse,
  ReviewMode,
  ReviewResponse,
  SecurityReviewResponse,
} from "@/types/review";

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  timeout: 170_000,
  headers: { "Content-Type": "application/json" },
});

export class ApiClientError extends Error {
  code: string;
  status: number | null;

  constructor(code: string, message: string, status: number | null) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function toClientError(err: unknown): ApiClientError {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<ApiErrorBody>;
    if (e.response) {
      const body = e.response.data;
      if (body && typeof body === "object" && "error" in body && body.error?.message) {
        return new ApiClientError(body.error.code, body.error.message, e.response.status);
      }
      return new ApiClientError("server_error", `The server returned an unexpected error (HTTP ${e.response.status}).`, e.response.status);
    }
    if (e.code === "ECONNABORTED") {
      return new ApiClientError("timeout", "The request timed out. Try again or analyze a smaller piece of code.", null);
    }
    return new ApiClientError("network_error", "Could not connect to the CodeLens backend. Check that the server is running.", null);
  }
  return new ApiClientError("unknown", "An unexpected error occurred.", null);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  try {
    const res = await client.post<T>(path, body);
    return res.data;
  } catch (err) {
    throw toClientError(err);
  }
}

interface CodePayload {
  code: string;
  language: LanguageId;
}

export const api = {
  review: (p: CodePayload & { review_mode: ReviewMode; explanation_level?: ExplanationLevel }) =>
    post<ReviewResponse>("/api/review", p),
  explain: (p: CodePayload & { level: ExplanationLevel }) => post<ExplainResponse>("/api/explain", p),
  optimize: (p: CodePayload) => post<OptimizeResponse>("/api/optimize", p),
  securityReview: (p: CodePayload) => post<SecurityReviewResponse>("/api/security-review", p),
  async health(): Promise<{ ok: boolean; engine?: string; ai_configured?: boolean; model?: string }> {
    try {
      const res = await client.get("/api/health", { timeout: 6000 });
      return res.data;
    } catch {
      return { ok: false };
    }
  },
};
