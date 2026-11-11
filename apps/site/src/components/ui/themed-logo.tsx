import { cn } from "@hummingbot/ui";

/**
 * A brand logo in the variant that reads on the current theme: `dark` is the
 * file made for dark backgrounds, `light` for light ones (falls back to
 * `dark`). Both are in the markup and CSS shows one, so there's no flash and
 * no client code; the hidden one is display:none, so assistive tech reads
 * only the visible one. Paths are relative to /brand/logos.
 */
export function ThemedLogo({
  dark,
  light,
  alt,
  className,
  height = 28,
}: {
  dark: string;
  light?: string;
  alt: string;
  className?: string;
  height?: number;
}) {
  if (!light) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/brand/logos/${dark}`} alt={alt} height={height} className={className} loading="lazy" />;
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/brand/logos/${dark}`}
        alt={alt}
        height={height}
        className={cn(className, "[[data-theme=light]_&]:hidden")}
        loading="lazy"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/brand/logos/${light}`}
        alt={alt}
        height={height}
        className={cn(className, "hidden [[data-theme=light]_&]:block")}
        loading="lazy"
      />
    </>
  );
}
