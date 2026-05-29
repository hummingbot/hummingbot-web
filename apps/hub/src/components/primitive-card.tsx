import { Bot, LineChart, Star, Workflow } from "lucide-react";
import Link from "next/link";
import { Badge, CopyButton } from "@hummingbot/ui";
import {
  installCommand,
  slugOf,
  type Primitive,
  type PrimitiveType,
} from "@/lib/registry";
import { fmtDate, fmtNum, PLURAL, SUBTYPE_LABEL } from "@/lib/types";

const typeIcon: Record<PrimitiveType, typeof Bot> = {
  strategy: LineChart,
  routine: Workflow,
  agent: Bot,
};

export function PrimitiveCard({ p }: { p: Primitive }) {
  const Icon = typeIcon[p.type];
  const href = `/${PLURAL[p.type]}/${p.namespace}/${p.name}`;

  return (
    <article className="rounded-xl border border-ink-800 bg-card p-5 transition-colors hover:border-ink-700">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-brand-teal">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={href}
              className="font-mono text-sm text-foreground hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              translate="no"
            >
              {slugOf(p)}
            </Link>
            {p.certified && <Badge variant="brand">Certified</Badge>}
            {p.subtype && p.subtype !== "routine" && (
              <Badge variant="default">{SUBTYPE_LABEL[p.subtype]}</Badge>
            )}
            {p.type === "routine" && p.continuous != null && (
              <Badge variant="default">{p.continuous ? "Continuous" : "One-shot"}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-400 text-pretty">{p.summary}</p>

          <div className="mt-3 flex items-center gap-2 rounded-md bg-ink-950 px-3 py-1.5">
            <code className="flex-1 truncate font-mono text-xs text-ink-400" translate="no">
              {installCommand(p)}
            </code>
            <CopyButton value={installCommand(p)} label="Copy install command" className="size-6 shrink-0" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            <span className="font-mono">v{p.latest}</span>
            {p.installs != null && (
              <span className="tabular-nums">{fmtNum(p.installs)} installs</span>
            )}
            {p.stars != null && (
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                <Star className="size-3 fill-current" aria-hidden="true" />
                {p.stars}
              </span>
            )}
            {p.cohort != null && <span>Cohort {p.cohort}</span>}
            <span>updated {fmtDate(p.updated)}</span>
            <span>{p.license}</span>
          </div>

          {p.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {p.tags.map((t) => (
                <span key={t} className="rounded-full bg-ink-900 px-2 py-0.5 text-xs text-ink-400">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
