import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "./lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-ink-700 bg-ink-900 text-ink-300",
        brand: "border-brand-teal/30 bg-brand-teal/10 text-brand-teal",
        accent: "border-accent/30 bg-accent/10 text-accent",
        bull: "border-bull/30 bg-bull/10 text-bull",
        bear: "border-bear/30 bg-bear/10 text-bear",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
