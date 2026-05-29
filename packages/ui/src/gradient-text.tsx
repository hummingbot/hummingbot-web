import type { HTMLAttributes } from "react";
import { cn } from "./lib/cn";

/** Brand-gradient text for hero/section headings (teal → magenta). */
export function GradientText({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-brand-teal via-brand-cyan to-brand-magenta bg-clip-text text-transparent",
        className,
      )}
      {...props}
    />
  );
}
