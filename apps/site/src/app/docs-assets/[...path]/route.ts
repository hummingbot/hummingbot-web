import fs from "node:fs/promises";
import path from "node:path";
import { DOCS_SOURCE_DIR } from "@/lib/docs";

// Images and files referenced by the docs, served from the mkdocs checkout.
const DOCS_DIR = path.join(DOCS_SOURCE_DIR, "docs");

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path: segments } = await params;
  const file = path.resolve(DOCS_DIR, ...segments);
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!file.startsWith(DOCS_DIR + path.sep) || !type) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
        // SVGs come from a repo we don't control here; don't let them run script.
        ...(type === "image/svg+xml" ? { "Content-Security-Policy": "script-src 'none'" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
