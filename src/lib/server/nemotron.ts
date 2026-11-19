import { getConfig } from "./config";
import { ApiError } from "./errors";
import { parseModelJson } from "./parser";

interface ChatCompletion {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
}

export function isAiConfigured(): boolean {
  return getConfig().apiKey.length > 0;
}

/**
 * Calls the NVIDIA Nemotron model through the OpenAI-compatible chat completions endpoint
 * and returns the raw text content. The API key never leaves the server.
 */
export async function callNemotron(system: string, user: string): Promise<string> {
  const cfg = getConfig();
  if (!cfg.apiKey) {
    throw new ApiError(
      503,
      "ai_not_configured",
      "NVIDIA API is not configured. Set NVIDIA_API_KEY (and optionally NEMOTRON_MODEL / NVIDIA_API_BASE_URL) on the server to enable AI reviews.",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: cfg.maxTokens,
        stream: false,
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ApiError(504, "ai_timeout", "The AI model took too long to respond. Try again, or analyze a smaller piece of code.");
    }
    console.error("[codelens] Nemotron network error:", err instanceof Error ? err.message : err);
    throw new ApiError(502, "ai_unavailable", "Could not reach the NVIDIA API. Check your network connection and NVIDIA_API_BASE_URL.");
  }

  if (!res.ok) {
    const bodyText = (await res.text().catch(() => "")).slice(0, 300);
    console.error(`[codelens] Nemotron API error ${res.status}: ${bodyText}`);
    if (res.status === 401 || res.status === 403) {
      throw new ApiError(502, "ai_invalid_key", "The NVIDIA API rejected the credentials. Check that NVIDIA_API_KEY is valid and has access to the selected model.");
    }
    if (res.status === 404) {
      throw new ApiError(502, "ai_model_not_found", "The configured Nemotron model was not found. Check NEMOTRON_MODEL.");
    }
    if (res.status === 429) {
      throw new ApiError(429, "ai_rate_limited", "The NVIDIA API rate limit was reached. Please wait a moment and try again.");
    }
    throw new ApiError(502, "ai_unavailable", `The NVIDIA API returned an error (HTTP ${res.status}). Please try again shortly.`);
  }

  let data: ChatCompletion;
  try {
    data = (await res.json()) as ChatCompletion;
  } catch {
    throw new ApiError(502, "ai_malformed_response", "The NVIDIA API returned an unreadable response.");
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new ApiError(502, "ai_malformed_response", "The AI returned an empty response. Please try again.");
  }
  return content;
}

export async function callNemotronJson(system: string, user: string): Promise<unknown> {
  return parseModelJson(await callNemotron(system, user));
}
