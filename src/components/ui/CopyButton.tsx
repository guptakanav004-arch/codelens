"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { copyText } from "@/utils/format";

export function CopyButton({
  text,
  label = "Copy",
  className = "",
  iconOnly = false,
}: {
  text: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function onCopy() {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      toast("Copied to clipboard", "success");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast("Could not access the clipboard", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      className={`inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-panel2 px-2 text-[11px] font-medium text-muted transition hover:border-linestrong hover:text-fg ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {!iconOnly && (copied ? "Copied" : label)}
    </button>
  );
}
