import Image from "next/image";
import Link from "next/link";
import { cn } from "@hummingbot/ui";

/**
 * Hummingbot logo + wordmark, the same marks as Botcamp's header: white on
 * the dark theme (hbot-dark), black on the light one (hbot-light). A
 * `product` reads as Botcamp's "Hummingbot Botcamp" wordmark, the product name
 * in gold.
 */
export function Logo({ className, product }: { className?: string; product?: string }) {
  return (
    <Link
      href="/"
      aria-label="Hummingbot home"
      className={cn(
        "inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Image
        src="/brand/marks/hbot-dark.png"
        alt=""
        width={40}
        height={40}
        className="mr-3 [[data-theme=light]_&]:hidden"
        priority
      />
      <Image
        src="/brand/marks/hbot-light.png"
        alt=""
        width={40}
        height={40}
        className="mr-3 hidden [[data-theme=light]_&]:block"
        priority
      />
      <span className="text-xl font-bold">
        <span className="text-foreground">Hummingbot</span>
        {product && <span className="brand-word"> {product}</span>}
      </span>
    </Link>
  );
}
