import Image from "next/image";
import { cn } from "@hummingbot/ui";
import { localImageSize } from "@/lib/image-size";

/** A logo through next/image at its displayed size (`height` CSS px, width
 * from the file's aspect ratio), so Next serves a resized WebP/AVIF instead
 * of the full-size PNG. */
function Logo({ file, alt, height, className }: { file: string; alt: string; height: number; className?: string }) {
  const src = `/brand/logos/${file}`;
  const size = localImageSize(src);
  const width = size ? Math.max(1, Math.round((height * size.width) / size.height)) : height * 4;
  return <Image src={src} alt={alt} width={width} height={height} className={className} />;
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
