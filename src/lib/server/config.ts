export const SUPPORTED_LANGUAGES = [
  "python",
  "java",
  "c",
  "cpp",
  "javascript",
  "typescript",
  "html",
  "css",
  "sql",
] as const;

export const REVIEW_MODES = ["full", "security", "performance", "quick"] as const;
export const EXPLANATION_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export const MAX_CODE_CHARS = 60_000;
export const MAX_CODE_LINES = 2_000;

export function getConfig() {
  return {
    apiKey: (process.env.NVIDIA_API_KEY ?? "").trim(),
    model: (process.env.NEMOTRON_MODEL ?? "nvidia/llama-3.3-nemotron-super-49b-v1.5").trim(),
    baseUrl: (process.env.NVIDIA_API_BASE_URL ?? "https://integrate.api.nvidia.com/v1").trim().replace(/\/+$/, ""),
    timeoutMs: Number(process.env.NEMOTRON_TIMEOUT_SECONDS ?? 90) * 1000,
    maxTokens: Number(process.env.NEMOTRON_MAX_TOKENS ?? 6000),
    /** When set, API routes proxy to the FastAPI backend instead of the built-in engine. */
    backendUrl: (process.env.BACKEND_API_URL ?? "").trim().replace(/\/+$/, ""),
  };
}
