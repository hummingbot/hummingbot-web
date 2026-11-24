import { Download, ExternalLink } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import {
  STARTER_AGENT_DEFAULTS,
  STARTER_AGENT_DIR,
  starterAgentFileRoles,
} from "@/botcamp/lib/agent-starter-package"

// Condor's own agents, the best reference for a package it will install.
export const CONDOR_EXAMPLE_AGENTS_URL = "https://github.com/hummingbot/condor/tree/main/agents"

// The structure is the starter agent's own files, so what the guide shows is
// exactly what the download contains — and what the package check accepts
// (agent-starter-package.test.ts).
const FILES = starterAgentFileRoles(STARTER_AGENT_DEFAULTS)

/** The layout of a Condor agent package, shown on the upload screens, with the starter agent to download. */
export function AgentPackageGuide(): React.JSX.Element {
  return (
    <div className="space-y-bc-4 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Upload the agent folder as Condor loads it. Starting from scratch? The starter agent has every file in
          place, with a README in docs/ on what each one does.
        </p>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href="/api/agent-starter" download>
            <Download className="mr-2 h-4 w-4" />
            Download the Starter Agent
          </a>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-bc-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
        <p className="text-foreground">{STARTER_AGENT_DIR}/</p>
        <ul>
          {FILES.map(({ path, role }, i) => (
            <li key={path} className="flex gap-3 whitespace-nowrap">
              <span className="text-muted-foreground">{i === FILES.length - 1 ? "└─" : "├─"}</span>
              <span className="text-foreground">{path}</span>
              <span className="text-muted-foreground">{role}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Only these files are accepted: <code className="font-mono">AGENT.md</code> (plus{" "}
        <code className="font-mono">shutdown.md</code>, <code className="font-mono">reflect.md</code>,{" "}
        <code className="font-mono">core_rules.md</code>), and the <code className="font-mono">loops/</code>,{" "}
        <code className="font-mono">skills/</code>, <code className="font-mono">routines/</code>,{" "}
        <code className="font-mono">controllers/</code> and <code className="font-mono">docs/</code> folders laid out as
        above. Anything else — a top-level README or <code className="font-mono">PROFILE.yml</code>,{" "}
        <code className="font-mono">conf/</code>, a loop&apos;s <code className="font-mono">config.yml</code>,{" "}
        <code className="font-mono">tests/</code>, Hummingbot&apos;s{" "}
        <code className="font-mono">controllers/&lt;type&gt;/&lt;name&gt;.py</code> — refuses the upload, with the list of
        files to remove.{" "}
        <a
          href={CONDOR_EXAMPLE_AGENTS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
        >
          More examples in Condor
          <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  )
}
