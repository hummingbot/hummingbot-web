/**
 * Intrinsic size of local images (public/ and the docs checkout), read from
 * the file header on the server so <img> tags can carry width/height and not
 * shift the layout as they load. Supports PNG, JPEG, GIF, WebP and SVG.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Element, Root } from "hast";
import { DOCS_ASSETS_BASE, DOCS_SOURCE_DIR } from "@/lib/docs";

export type ImageSize = { width: number; height: number };

const PUBLIC_DIR = path.join(process.cwd(), "public");
const DOCS_DIR = path.join(DOCS_SOURCE_DIR, "docs");
const cache = new Map<string, ImageSize | null>();

function pngSize(b: Buffer): ImageSize | null {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gifSize(b: Buffer): ImageSize | null {
  if (b.length < 10 || b.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function jpegSize(b: Buffer): ImageSize | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    const len = b.readUInt16BE(i + 2);
    // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function webpSize(b: Buffer): ImageSize | null {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  return null;
}

function svgSize(b: Buffer): ImageSize | null {
  const tag = b.toString("utf8").match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) return null;
  const attr = (name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([\\d.]+)(px)?["']`, "i"))?.[1];
  const w = Number(attr("width"));
  const h = Number(attr("height"));
  if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  const vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (vb && Number(vb[1]) > 0 && Number(vb[2]) > 0) {
    return { width: Math.round(Number(vb[1])), height: Math.round(Number(vb[2])) };
  }
  return null;
}

/** Width and height of the image file at `file`, or null if unreadable/unknown. */
export function imageFileSize(file: string): ImageSize | null {
  if (cache.has(file)) return cache.get(file)!;
  let size: ImageSize | null = null;
  try {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".svg") {
      size = svgSize(fs.readFileSync(file));
    } else {
      // Headers sit at the start of the file; JPEG may need to skip EXIF blocks.
      const fd = fs.openSync(file, "r");
      try {
        const buf = Buffer.alloc(ext === ".jpg" || ext === ".jpeg" ? 256 * 1024 : 64);
        const n = fs.readSync(fd, buf, 0, buf.length, 0);
        const b = buf.subarray(0, n);
        size = pngSize(b) ?? jpegSize(b) ?? gifSize(b) ?? webpSize(b);
      } finally {
        fs.closeSync(fd);
      }
    }
  } catch {
    size = null;
  }
  if (size && (!size.width || !size.height)) size = null;
  cache.set(file, size);
  return size;
}

function within(dir: string, file: string): boolean {
  return file.startsWith(dir + path.sep);
}

/**
 * Size of an image by its site URL: `/docs-assets/...` (the docs checkout) or
 * any other root-relative path (public/). Null for remote or unknown images.
 */
export function localImageSize(url: string): ImageSize | null {
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.split(/[?#]/)[0]);
  } catch {
    return null;
  }
  const [dir, rel] = pathname.startsWith(`${DOCS_ASSETS_BASE}/`)
    ? [DOCS_DIR, pathname.slice(DOCS_ASSETS_BASE.length + 1)]
    : [PUBLIC_DIR, pathname.slice(1)];
  const file = path.resolve(dir, rel);
  return within(dir, file) ? imageFileSize(file) : null;
}

/**
 * Rehype plugin for rendered markdown: gives every local <img> its intrinsic
 * width/height (unless the markup already sets one), lazy-loads all images
 * but the first, and fetches the first one with high priority (it is often
 * the LCP element). `resolve` maps the markdown src to a site URL.
 */
export function rehypeImageDimensions({ resolve }: { resolve: (src: string) => string }) {
  return (tree: Root) => {
    let first = true;
    const visit = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== "element") continue;
        if (child.tagName === "img") {
          const props = child.properties;
          const src = typeof props.src === "string" ? props.src : null;
          if (src) {
            // Markup that sizes the image itself (either attribute) is left alone.
            if (props.width == null && props.height == null) {
              const size = localImageSize(resolve(src));
              if (size) {
                props.width = size.width;
                props.height = size.height;
              }
            }
            if (first) {
              props.loading = "eager";
              props.fetchPriority = "high";
              first = false;
            } else {
              props.loading = "lazy";
            }
            props.decoding = "async";
          }
        }
        visit(child);
      }
    };
    visit(tree);
  };
}
