import { Download, ExternalLink, Lock } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { SCORING_CRITERIA, SQUAD_RULES, STARTING_CAPITAL_QUOTE } from "@/botcamp/lib/hackathon-squads"
import { buildConfigSnippet, type RaceHost, type StarterKit } from "@/botcamp/lib/hackathon-starter-kit"

interface StarterKitPanelProps {
  kit: StarterKit
  /** The starter package zip (/api/hackathons/[slug]/starter-kit). */
  downloadHref: string
  /**
   * Hosts for a builder holding a finals seat. Undefined on public pages,
   * where the row says where to find them instead.
   */
  hosts?: RaceHost[]
  /** Fills the config snippet for a seated builder's own agent. */
  agent?: { team: string; agent: string }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

const NOT_SET = <span className="text-muted-foreground">Announced before the race.</span>

/** The values every agent must use — one list, the same for every racer. */
export function StarterKitPanel({ kit, downloadHref, hosts, agent }: StarterKitPanelProps) {
  // A seated builder with exactly one host gets it filled in; otherwise the
  // snippet keeps the placeholder.
  const snippet = buildConfigSnippet(kit, {
    startingCapital: STARTING_CAPITAL_QUOTE,
    serverName: hosts?.length === 1 ? hosts[0].name : undefined,
    ...agent,
  })

  return (
    <div className="space-y-bc-6">
      <dl className="overflow-hidden rounded-bc-lg border border-border">
        <Row label="Host">
          {hosts === undefined ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Shared with finalists on their hackathon dashboard once they hold a seat.
            </p>
          ) : hosts.length === 0 ? (
            NOT_SET
          ) : (
            <ul className="space-y-bc-1.5">
              {hosts.map((h) => (
                <li key={h.name}>
                  <code className="font-mono text-foreground">{h.name}</code>
                  {h.address && <span className="ml-2 font-mono text-muted-foreground">{h.address}</span>}
                  {h.note && <span className="ml-2 text-muted-foreground">— {h.note}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Set it as <code>server_name</code> in AGENT.md — never <code>local</code> or blank. Condor
            normally suggests leaving it empty; for the race it&apos;s pinned so the agent trades on the
            race host. Clear it after the race. An agent published from Condor gets it set again when
            it&apos;s deployed.
          </p>
        </Row>

        <Row label="Model">
          {kit.llmProvider || kit.approvedModels.length > 0 ? (
            <>
              {kit.llmProvider && <p>{kit.llmProvider}</p>}
              {kit.approvedModels.length > 0 && (
                <ul className="mt-1 space-y-bc-0.5">
                  {kit.approvedModels.map((m) => (
                    <li key={m}>
                      <code className="font-mono">{m}</code>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1.5 text-xs text-muted-foreground">
                Use one of these as <code>agent_key</code> in AGENT.md and every loop.md.
              </p>
            </>
          ) : (
            NOT_SET
          )}
        </Row>

        <Row label="Venues & Pairs">
          {kit.markets.length > 0 ? (
            <ul className="space-y-bc-1.5">
              {kit.markets.map((m) => (
                <li key={m.venue}>
                  <span className="font-medium">{m.venue}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{m.connectors.join(", ")}</span>
                  <span className="ml-2 text-muted-foreground">
                    · {m.pairs.length > 0 ? m.pairs.join(", ") : "any pair"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            NOT_SET
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Every <code>connector_name</code> in your configs must be one of these.
          </p>
        </Row>

        <Row label="Starting Capital">
          <p>{SQUAD_RULES.startingCapital}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            The <code>total_amount_quote</code> of all your loops and controller configs together
            must not exceed {SQUAD_RULES.startingCapitalAmount}.
          </p>
        </Row>

        <Row label="Position Mode">
          <code className="font-mono">{kit.positionMode}</code>
          <p className="mt-1.5 text-xs text-muted-foreground">
            <code>position_mode</code> in every perp controller config. It&apos;s set for the whole account on a
            connector, so every agent on a race account uses the same one.
          </p>
        </Row>

        <Row label="Shutdown">
          <code className="font-mono">{kit.shutdownPolicy}</code>
          <p className="mt-1.5 text-xs text-muted-foreground">
            <code>on_kill_switch</code> in a <code>shutdown.md</code> at the top of your agent — what a wind-down
            closes, so no funded position is left with nobody watching it.
          </p>
        </Row>

        <Row label="Naming">
          <code className="font-mono">{kit.botNamePattern}</code>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Your <code>bot_name</code>: {"{team}"} is your team&apos;s slug, {"{agent}"} your strategy&apos;s slug.
          </p>
        </Row>

        <Row label="Scoring">
          <ul className="space-y-bc-0.5">
            {SCORING_CRITERIA.map((c) => (
              <li key={c.key}>
                {c.label} <span className="font-mono text-muted-foreground">{c.weight}%</span>
              </li>
            ))}
          </ul>
        </Row>

        <Row label="Support">
          {kit.supportUrl ? (
            <a
              href={kit.supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              {kit.supportLabel || kit.supportUrl}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            kit.supportLabel || NOT_SET
          )}
        </Row>
      </dl>

      {kit.notes && <MarkdownContent content={kit.notes} className="text-sm" />}

      <div className="flex flex-col gap-4 rounded-bc-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Download the Example Agent</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            A complete agent in the layout Condor installs — AGENT.md, a loop, a skill, a Hummingbot
            V2 controller and its sample config — with these values already pinned. The README
            explains every file, has a checklist before you submit, and how to submit it.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <a href={downloadHref} download>
            <Download className="mr-2 h-4 w-4" />
            Download .zip
          </a>
        </Button>
      </div>

      <div>
        <h3 className="text-base font-semibold">Pin These Values in Your Package</h3>
        <p className="mb-3 mt-1.5 text-sm text-muted-foreground">
          Already have an agent? Copy these into its files before you submit, so it runs as-is on race day.
        </p>
        <pre className="overflow-x-auto rounded-bc-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
          {snippet}
        </pre>
      </div>
    </div>
  )
}
