import Link from "next/link";
import { cn } from "@hummingbot/ui";

/** Hummingbot wordmark — teal hummingbird glyph + name. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Hummingbot home"
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-6 text-brand-teal"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2c2.2 3.1 5.3 4.4 8.5 4.8-.6 4.7-3 7.8-6 9.4l2 5.8-4.5-3.2L7.5 22l2-5.8c-3-1.6-5.4-4.7-6-9.4C6.7 6.4 9.8 5.1 12 2z" />
      </svg>
      <span className="text-lg">Hummingbot</span>
    </Link>
  );
}
