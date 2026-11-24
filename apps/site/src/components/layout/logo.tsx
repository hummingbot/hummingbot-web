import Link from "next/link";
import { cn } from "@hummingbot/ui";

/**
 * Hummingbot's hummingbird, from hbui (github.com/hummingbot/hbui,
 * assets/svgs/logos/HummingbotLogo.js) in its primary colors: a teal body and
 * wings in deeper teals. It reads on both themes, so there is one mark.
 */
export function HummingbotMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 47 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#00858B"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M38.377 20.314c-3.86 1.27-7.732.814-10.28-.92 1.06-2.918 3.93-5.592 7.790-6.862 3.861-1.27 7.732-.814 10.28.919a8.434 8.434 0 01-.29.696c-1.236 2.642-3.95 4.998-7.5 6.167z"
      />
      <path
        fill="#007E82"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M37.035 24.621c-4.028-.5-7.348-2.57-8.937-5.23 2.174-2.193 5.889-3.39 9.917-2.89s7.349 2.57 8.938 5.23c-.12.12-.244.238-.372.352-2.212 1.968-5.738 3.010-9.546 2.538z"
      />
      <path
        fill="#006E72"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M33.71 28.228c-3.361-2.305-5.389-5.68-5.61-8.783 2.921-.949 6.766-.3 10.128 2.006 3.362 2.305 5.39 5.68 5.61 8.783a8.02 8.02 0 01-.558.16c-2.841.701-6.417-.005-9.57-2.166z"
      />
      <path
        fill="#006063"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M29.538 29.806c-2.09-3.528-2.524-7.456-1.434-10.363 3.043.39 6.258 2.622 8.348 6.15 2.09 3.529 2.525 7.457 1.434 10.364a8.136 8.136 0 01-.754-.133c-2.81-.632-5.676-2.78-7.594-6.017z"
      />
      <path
        fill="#00A8B3"
        fillOpacity="0.84"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M31.525 7.544c-.655 7.41-7.108 12.878-14.414 12.215-.9-.082-1.772-.253-2.607-.505L30.015 0a13.568 13.568 0 011.51 7.544z"
      />
      <path
        fill="#00C2CE"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.534 15.493l-.114-.077c-1.752-1.162-3.717-2.624-5.781-3.094-1.364-.311-2.702-.068-3.820.778-1.002.758-1.248 1.880-2.050 2.767C9.033 16.682 0 20.638 0 20.638l.126.3s8.438-3.780 10.157-3.464c1.719.317 5.195 1.387 7.408 5.888 2.333 4.743 6.832 7.673 9.332 7.311l-2.430 7.040c12.515.607 8.067-10.031 4.208-15.348 1.719-.5 3.386-1.253 4.925-2.076.94-.503 1.821-1.130 2.636-1.847 1.770-1.560 3.228-3.542 4.298-5.592 1.439-2.755 2.716-6.085 3.107-9.208l-22.233 11.850z"
      />
    </svg>
  );
}

/**
 * Hummingbot logo + wordmark. A `product` reads as a sub-brand wordmark
 * ("Hummingbot Botcamp"), the product name in the accent color.
 */
export function Logo({ className, product }: { className?: string; product?: string }) {
  return (
    <Link
      href="/"
      aria-label={product ? `Hummingbot ${product} home` : "Hummingbot home"}
      className={cn(
        "inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <HummingbotMark className="mr-2.5 h-8 w-auto" />
      <span className="text-xl font-bold">
        <span className="text-foreground">Hummingbot</span>
        {product && <span className="brand-word"> {product}</span>}
      </span>
    </Link>
  );
}
