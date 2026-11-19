import { AlertOctagon, KeyRound, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ErrorState({
  code,
  message,
  onRetry,
}: {
  code: string;
  message: string;
  onRetry?: () => void;
}) {
  const needsConfig = code === "ai_not_configured" || code === "ai_invalid_key";
  const offline = code === "network_error" || code === "backend_unreachable";
  const Icon = needsConfig ? KeyRound : offline ? WifiOff : AlertOctagon;
  const title = needsConfig
    ? code === "ai_invalid_key"
      ? "NVIDIA API key rejected"
      : "AI configuration required"
    : offline
      ? "Can't reach the backend"
      : code === "ai_rate_limited"
        ? "Rate limit reached"
        : code === "ai_timeout" || code === "timeout"
          ? "The request timed out"
          : "Analysis failed";
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" role="alert">
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${needsConfig ? "border-warning/30 bg-warning/10 text-warning" : "border-danger/30 bg-danger/10 text-danger"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{message}</p>
      {needsConfig && (
        <div className="mt-4 max-w-sm rounded-lg border border-line bg-panel2 px-3 py-2.5 text-left font-mono text-[11px] leading-relaxed text-muted">
          NVIDIA_API_KEY=nvapi-…
          <br />
          NEMOTRON_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1.5
          <br />
          NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
        </div>
      )}
      {onRetry && !needsConfig && (
        <Button className="mt-5" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
      <p className="mt-3 text-[11px] text-subtle">Error code: {code}</p>
    </div>
  );
}
