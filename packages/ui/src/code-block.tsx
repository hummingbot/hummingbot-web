import { cn } from "./lib/cn";
import { CopyButton } from "./copy-button";

/** Monospace command block with a copy button — the bun.sh signature move. */
export function CodeBlock({
  command,
  prompt = "$",
  className,
}: {
  command: string;
  prompt?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-950 px-4 py-3 font-mono text-sm",
        className,
      )}
    >
      {prompt ? (
        <span className="select-none text-ink-500" aria-hidden="true">
          {prompt}
        </span>
      ) : null}
      <code className="flex-1 overflow-x-auto whitespace-nowrap text-foreground" translate="no">
        {command}
      </code>
      <CopyButton value={command} label="Copy command" className="-mr-1 shrink-0" />
    </div>
  );
}
