import { ArrowUpRight } from "lucide-react";

/** Embeds a routine's rendered example report (self-contained HTML with Plotly)
 *  in a sandboxed iframe, with a link to open it full-screen. */
export function ReportFrame({ src, title }: { src: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-800 bg-ink-950">
      <div className="flex items-center justify-between border-b border-ink-800 bg-ink-900/60 px-3 py-2">
        <span className="text-xs text-ink-500">Example report — sample run output</span>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-teal hover:underline"
        >
          Open full screen <ArrowUpRight className="size-3" aria-hidden="true" />
        </a>
      </div>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups"
        className="h-[540px] w-full bg-[#0d1117]"
      />
    </div>
  );
}
