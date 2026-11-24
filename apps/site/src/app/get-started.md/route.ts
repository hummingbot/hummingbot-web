import { guideToMarkdown } from "@/lib/get-started";

export const dynamic = "force-static";

/** /get-started.md — the whole guide as Markdown, for AI assistants. */
export function GET() {
  return new Response(guideToMarkdown(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
