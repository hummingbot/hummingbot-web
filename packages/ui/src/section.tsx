import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./lib/cn";

/** Full-bleed section with a centered max-width container + vertical rhythm. */
export const Section = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement> & { containerClassName?: string }
>(({ className, containerClassName, children, ...props }, ref) => (
  <section
    ref={ref}
    className={cn("w-full px-4 py-16 sm:py-24", className)}
    {...props}
  >
    <div className={cn("mx-auto w-full max-w-6xl", containerClassName)}>
      {children}
    </div>
  </section>
));
Section.displayName = "Section";
