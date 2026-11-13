import type { ReactNode } from "react";
import { cn } from "@hummingbot/ui";

const OUTER = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
} as const;
const INNER = {
  lg: "rounded-[7px]",
  xl: "rounded-[11px]",
  "2xl": "rounded-[15px]",
} as const;

/**
 * A 1px gold gradient border with a soft light running slowly round it, and a
 * faint glow outside (ported from Botcamp). Still under prefers-reduced-motion.
 */
export function GlowBorder({
  children,
  className,
  rounded = "xl",
}: {
  children: ReactNode;
  /** Classes for the inner surface (its background, padding, layout). */
  className?: string;
  rounded?: keyof typeof OUTER;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden p-px shadow-[0_0_40px_-12px_hsl(var(--primary)/0.45)]",
        OUTER[rounded],
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/15 to-secondary/50"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,hsl(var(--primary))_50deg,rgb(255_255_255/0.85)_65deg,hsl(var(--primary))_80deg,transparent_130deg)] motion-safe:animate-[spin_8s_linear_infinite]"
      />
      <div className={cn("relative bg-background", INNER[rounded], className)}>
        {children}
      </div>
    </div>
  );
}
