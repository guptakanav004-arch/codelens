import { getConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getConfig();
  let backend: "builtin" | "python-ok" | "python-unreachable" = "builtin";
  if (cfg.backendUrl) {
    try {
      const r = await fetch(`${cfg.backendUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      backend = r.ok ? "python-ok" : "python-unreachable";
    } catch {
      backend = "python-unreachable";
    }
  }
  return Response.json({
    ok: true,
    service: "codelens-ai",
    engine: backend,
    ai_configured: cfg.apiKey.length > 0,
    model: cfg.model,
  });
}
