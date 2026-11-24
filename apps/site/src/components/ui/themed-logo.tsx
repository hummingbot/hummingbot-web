import { cn } from "@hummingbot/ui";

/** A logo at `height` CSS px, width from its aspect ratio. */
function Logo({ file, alt, height, className }: { file: string; alt: string; height: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small brand PNGs, as the site already served them
    <img src={`/brand/logos/${file}`} alt={alt} height={height} loading="lazy" className={className} />
  );
}

/**
 * A brand logo in the variant that reads on the current theme: `dark` is the
 * file made for dark backgrounds, `light` for light ones (falls back to
 * `dark`). Both are in the markup and CSS shows one, so there's no flash and
 * no client code; the hidden one is display:none, so assistive tech reads
 * only the visible one (and the browser doesn't fetch a lazy display:none
 * image). Paths are relative to /brand/logos.
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
    return <Logo file={dark} alt={alt} height={height} className={className} />;
  }
  return (
    <>
      <Logo file={dark} alt={alt} height={height} className={cn(className, "[[data-theme=light]_&]:hidden")} />
      <Logo file={light} alt={alt} height={height} className={cn(className, "hidden [[data-theme=light]_&]:block")} />
    </>
  );
}
