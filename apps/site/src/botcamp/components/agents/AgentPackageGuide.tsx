import { Download, ExternalLink } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import {
  STARTER_AGENT_DEFAULTS,
  STARTER_AGENT_DIR,
  starterAgentFileRoles,
} from "@/botcamp/lib/agent-starter-package"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

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
          place, with a README on what each one does.
        </p>
        {/* Read-only preview: Botcamp serves this zip from /api/agent-starter, which this site doesn't have. */}
        <ReadOnlyHint className="shrink-0">
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Download the Starter Agent
          </Button>
        </ReadOnlyHint>
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
        Text files only: Markdown, YAML, Python, JSON. Anything outside these folders (<code className="font-mono">conf/</code>,
        a loop&apos;s <code className="font-mono">config.yml</code>, <code className="font-mono">tests/</code>) is left
        out, since Condor won&apos;t install it, and a controller in Hummingbot&apos;s{" "}
        <code className="font-mono">controllers/&lt;type&gt;/&lt;name&gt;.py</code> layout uploads but Condor won&apos;t
        find it.{" "}
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
