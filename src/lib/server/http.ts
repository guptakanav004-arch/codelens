import {
  EXPLANATION_LEVELS,
  MAX_CODE_CHARS,
  MAX_CODE_LINES,
  REVIEW_MODES,
  SUPPORTED_LANGUAGES,
  getConfig,
} from "./config";
import { ApiError, errorResponse } from "./errors";
import type { ExplanationLevel, LanguageId, ReviewMode } from "@/types/review";

export interface CodeRequest {
  code: string;
  language: LanguageId;
  review_mode: ReviewMode;
  explanation_level: ExplanationLevel;
}

export function validateCodeRequest(body: unknown): CodeRequest {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "invalid_request", "Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.code !== "string" || b.code.trim().length === 0) {
    throw new ApiError(422, "empty_code", "Please provide some source code to analyze.");
  }
  if (b.code.length > MAX_CODE_CHARS) {
    throw new ApiError(
      413,
      "code_too_large",
      `Source code is too large (${b.code.length.toLocaleString()} characters). The limit is ${MAX_CODE_CHARS.toLocaleString()} characters.`,
    );
  }
  const lines = b.code.split("\n").length;
  if (lines > MAX_CODE_LINES) {
    throw new ApiError(413, "code_too_large", `Source code has ${lines} lines. The limit is ${MAX_CODE_LINES} lines.`);
  }
  if (b.code.includes("\u0000")) {
    throw new ApiError(422, "invalid_code", "Source code appears to be binary and cannot be analyzed.");
  }
  const language = String(b.language ?? "").toLowerCase();
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(language)) {
    throw new ApiError(
      400,
      "unsupported_language",
      `Unsupported language "${String(b.language ?? "")}". Supported: ${SUPPORTED_LANGUAGES.join(", ")}.`,
    );
  }
  const mode = String(b.review_mode ?? "full").toLowerCase();
  if (!(REVIEW_MODES as readonly string[]).includes(mode)) {
    throw new ApiError(400, "invalid_review_mode", `Invalid review mode. Use one of: ${REVIEW_MODES.join(", ")}.`);
  }
  const level = String(b.level ?? b.explanation_level ?? "intermediate").toLowerCase();
  if (!(EXPLANATION_LEVELS as readonly string[]).includes(level)) {
    throw new ApiError(400, "invalid_level", `Invalid level. Use one of: ${EXPLANATION_LEVELS.join(", ")}.`);
  }
  return {
    code: b.code.replace(/\r\n/g, "\n"),
    language: language as LanguageId,
    review_mode: mode as ReviewMode,
    explanation_level: level as ExplanationLevel,
  };
}

/**
 * Shared route handler. Proxies to the FastAPI backend when BACKEND_API_URL is configured,
 * otherwise runs the built-in engine. Never leaks stack traces to the client.
 */
export async function handleApi(
  req: Request,
  path: string,
  local: (body: CodeRequest) => Promise<unknown>,
): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  const { backendUrl } = getConfig();
  if (backendUrl) {
    try {
      const upstream = await fetch(`${backendUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw),
        signal: AbortSignal.timeout(150_000),
      });
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
      });
    } catch (err) {
      console.error(`[codelens] Python backend unreachable at ${backendUrl}:`, err instanceof Error ? err.message : err);
      return errorResponse(502, "backend_unreachable", "The Python analysis backend is not reachable. Check that it is running.");
    }
  }

  try {
    const body = validateCodeRequest(raw);
    return Response.json(await local(body));
  } catch (err) {
    if (err instanceof ApiError) return errorResponse(err.status, err.code, err.message);
    console.error("[codelens] Unexpected error:", err instanceof Error ? err.message : err);
    return errorResponse(500, "internal_error", "Something went wrong while analyzing your code. Please try again.");
  }
}
