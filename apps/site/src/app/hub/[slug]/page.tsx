import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { CloneToCondor } from "@/components/hub/clone-to-condor";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import {
  condorConnectUrl,
  formatBytes,
  formatDate,
  getHubAgent,
} from "@/lib/hub";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getHubAgent(slug).catch(() => null);
  if (!agent) return {};
  return {
    title: `${agent.name} — Hub | Hummingbot`,
    description: agent.description,
  };
}

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

export default async function HubAgentPage({ params }: Params) {
  const { slug } = await params;
  const agent = await getHubAgent(slug).catch(() => null);
  if (!agent) notFound();

  const facts = [
    { label: "Version", value: `v${agent.version}` },
    { label: "Published", value: formatDate(agent.publishedAt) },
    { label: "Package", value: formatBytes(agent.bytes) },
    { label: "Access", value: agent.free ? "Free" : "Members" },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 md:px-6 md:py-14">
        <Link
          href="/hub"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> All agents
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <p className={`${kicker} mb-3 text-primary`}>Agent</p>
            <h1 className="mb-4 text-balance text-3xl font-bold leading-tight tracking-tight md:text-5xl">
              {agent.name}
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              by <span className="text-foreground">{agent.author.name}</span>
              {agent.author.handle && <span> · @{agent.author.handle}</span>}
            </p>
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <p className={`${kicker} mb-3 text-muted-foreground`}>
                What it does
              </p>
              <p className="whitespace-pre-line text-base leading-relaxed text-foreground/90">
                {agent.description}
              </p>
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6">
              <span className="mb-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <BadgeCheck className="size-3.5" aria-hidden="true" /> Validated
              </span>
              <p className="mb-5 text-sm text-muted-foreground">
                An AI review and a maintainer checked this exact version before
                it was listed.
              </p>
              <CloneToCondor
                slug={agent.slug}
                version={agent.version}
                name={agent.name}
                connectUrl={condorConnectUrl}
              />

              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-xs text-muted-foreground">Slug</p>
                <code className="block break-all font-mono text-xs text-foreground">
                  {agent.slug}
                </code>
                <p className="mt-3 text-xs text-muted-foreground">SHA-256</p>
                <code className="block break-all font-mono text-[11px] text-muted-foreground">
                  {agent.digest}
                </code>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
