"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "./lib/cn";

export function CopyButton({
  value,
  className,
  label = "Copy",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        // Clipboard can reject (insecure context / denied permission).
        console.warn(`[copy] clipboard write failed: ${(err as Error).message}`);
      },
    );
  }, [value]);

  return (
    <button
      type="button"
      onClick={onCopy}
      data-state={copied ? "copied" : "idle"}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-800 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {copied ? (
        <Check className="size-4 text-brand-teal" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
