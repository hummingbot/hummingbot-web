import Image from "next/image";
import {
  BadgeCheck,
  Bot,
  Check,
  ExternalLink,
  Globe,
  Lock,
  Search,
  Store,
  Upload,
} from "lucide-react";
import { cn } from "@hummingbot/ui";
import type { HubAgent } from "@/lib/hub";

/**
 * Condor's Agent Hub (Hub › Pull agents), redrawn in HTML with the real
 * catalogue. Decorative backdrop: hidden from assistive tech and not
 * focusable; the live catalogue is /hub.
 */
export function CondorHubMock({
  agents,
  className,
}: {
  agents: HubAgent[];
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      inert
      className={cn(
        "pointer-events-none select-none overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/60",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-background/60 px-4 py-3">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        </span>
        <Image
          src="/brand/marks/condor-logo-square.png"
          alt=""
          width={18}
          height={18}
          className="rounded-full"
        />
        <span className="font-mono text-xs text-muted-foreground">
          Condor · Agent Hub
        </span>
      </div>

      <div className="p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <Globe className="size-5" /> Agent Hub
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The catalogue of published agents, and this install&apos;s own
              publishing.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-bull" /> Connected to Hummingbot
          </span>
        </div>

        <div className="mt-5 flex gap-2 border-b border-border pb-5">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Store className="size-3.5" /> Pull agents
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Upload className="size-3.5" /> Publish yours
          </span>
        </div>

        <div className="mt-5 flex gap-2">
          <span className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground">
            <Search className="size-3.5" /> Search published agents
          </span>
          <span className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-medium">
            Search
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {agents.map((agent) => (
            <div
              key={agent.slug}
              className="flex flex-col rounded-xl border border-border bg-background/60 p-3.5"
            >
              <div className="flex items-start gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                  <Bot className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
                    {agent.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {agent.slug}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  <BadgeCheck className="size-3" /> Validated
                </span>
                {!agent.free && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Lock className="size-3" /> Members
                  </span>
                )}
              </div>
              <p className="mt-2.5 line-clamp-3 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                {agent.description}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <span className="truncate text-[10px] text-muted-foreground">
                  {agent.author.name} · v{agent.version}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <ExternalLink className="size-3 text-muted-foreground" />
                  <span className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold">
                    Review
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
