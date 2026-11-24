"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Lock } from "lucide-react";
import { cn } from "@hummingbot/ui";
import type { HubLibraryItem } from "@/lib/hub";
import {
  CandleBackdrop,
  Initials,
  RankNumeral,
  plainSummary,
} from "./strategy-cover";

/** A strategy in the Hub library: a generated cover over its name, author and summary (Botcamp's LibraryCard). */
export function LibraryCard({
  item,
  animationDelay = 0,
}: {
  item: HubLibraryItem;
  animationDelay?: number;
}) {
  const summary = plainSummary(item.description);
  const { showcase } = item;
  const isWinner = showcase?.rank === 1;

  return (
    <Link
      href={`/hub/${item.slug}`}
      className={cn(
        "hub-card group flex flex-col overflow-hidden rounded-xl border bg-card transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1",
        "border-border hover:border-primary/60 hover:shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.6)]",
        isWinner && "border-primary/60",
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="relative aspect-[16/7] overflow-hidden border-b border-border bg-[var(--cover-ink)] strategy-cover">
        <CandleBackdrop
          seed={item.slug}
          count={24}
          className="opacity-30 transition-opacity duration-500 group-hover:opacity-60 [[data-theme=light]_&]:opacity-50"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,var(--cover-ink)_20%,transparent_70%)]"
        />

        {showcase && (
          <RankNumeral
            rank={showcase.rank}
            size="sm"
            className="absolute right-4 top-3"
          />
        )}

        <div className="relative flex h-full flex-col justify-between p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              <BadgeCheck className="size-3" aria-hidden="true" />
              Condor Ready
            </span>
            <span className="rounded bg-[hsl(var(--cover-fg)/0.10)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--cover-fg)/0.75)]">
              Agent
            </span>
          </div>
          {item.exchanges.length > 0 && (
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--cover-fg)/0.60)]">
              {item.exchanges.join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug tracking-[-0.01em]">
          {item.name}
        </h3>
        {summary && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <Initials name={item.author.name} />
            <span className="truncate">{item.author.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {!item.free && <Lock className="size-3" aria-label="Members" />}
            {showcase && (
              <span className="max-w-[9rem] truncate">
                {showcase.hackathon}
              </span>
            )}
            <ArrowUpRight
              className="size-3.5 text-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
