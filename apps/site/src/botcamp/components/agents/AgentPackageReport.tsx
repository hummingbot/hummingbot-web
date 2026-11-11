import { CircleAlert, CircleCheck, CircleMinus, TriangleAlert } from "lucide-react"
import { alertColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"

export interface AgentPackageIssue {
  path?: string
  message: string
}

/** What POST /api/user/agent-packages/check answers with. */
export interface AgentPackageCheck {
  ok: boolean
  manifest?: { name: string; agentKey: string | null; tools: string[]; loops: string[] }
  description?: string | null
  /** Where the package trades, as the site's exchanges, to prefill the page. */
  exchanges?: string[]
  errors?: AgentPackageIssue[]
  warnings: AgentPackageIssue[]
  tree: { path: string; leftOut: string | null }[]
  source: "ZIP" | "GITHUB" | "CONDOR"
  sourceRef: string | null
}

// The check's result file by file: what Condor installs, what it leaves out
// and why, and which files have to be fixed. Problems that aren't about a
// listed file (no AGENT.md, too many files) go above the tree.
export function AgentPackageReport({ check }: { check: AgentPackageCheck }): React.JSX.Element {
  const errors = check.errors ?? []
  const errorsByPath = groupByPath(errors)
  const warningsByPath = groupByPath(check.warnings)
  // Issues that aren't on a listed file: package-wide ones, and paths the
  // check refused before rooting the package (an unsafe path).
  const listed = new Set(check.tree.map((entry) => entry.path))
  const unlisted = (issue: AgentPackageIssue) => !issue.path || !listed.has(issue.path)
  const general = [...errors.filter(unlisted), ...check.warnings.filter(unlisted)]
  const installed = check.tree.filter((entry) => !entry.leftOut).length
  const leftOut = check.tree.length - installed

  return (
    <div className="space-y-bc-4">
      <div
        className={cn(
          "flex items-start gap-3 rounded-bc-md px-4 py-3 text-sm",
          check.ok ? alertColors.success : alertColors.error,
        )}
      >
        {check.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
        <div>
          <p className="font-medium">
            {check.ok
              ? `${check.manifest?.name ?? "The agent"} is ready to submit`
              : `${errors.length} ${errors.length === 1 ? "problem" : "problems"} to fix before you can submit`}
          </p>
          <p className="mt-0.5 opacity-80">
            {installed} {installed === 1 ? "file" : "files"} Condor will install
            {leftOut > 0 && `, ${leftOut} left out`}
            {check.manifest && check.manifest.loops.length > 0 && ` · loops: ${check.manifest.loops.join(", ")}`}
            {check.source === "GITHUB" && check.sourceRef && ` · GitHub @ ${check.sourceRef.slice(0, 7)}`}
          </p>
        </div>
      </div>

      {general.length > 0 && (
        <ul className="space-y-bc-1.5 text-sm">
          {general.map((issue, i) => (
            <IssueLine key={i} issue={issue} error={errors.includes(issue)} />
          ))}
        </ul>
      )}

      {check.tree.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-bc-md border border-border font-mono text-xs">
          {check.tree.map((entry) => {
            const fileErrors = errorsByPath.get(entry.path) ?? []
            const fileWarnings = warningsByPath.get(entry.path) ?? []
            const status = fileErrors.length > 0 ? "error" : entry.leftOut ? "left-out" : "installed"
            return (
              <li key={entry.path} className={cn("px-3 py-2", status === "left-out" && "text-muted-foreground")}>
                <div className="flex items-start gap-2">
                  {status === "error" ? (
                    <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-destructive" aria-label="Error" />
                  ) : status === "left-out" ? (
                    <CircleMinus className="mt-px h-3.5 w-3.5 shrink-0" aria-label="Left out" />
                  ) : (
                    <CircleCheck className="mt-px h-3.5 w-3.5 shrink-0 text-success" aria-label="Installed" />
                  )}
                  <span className="min-w-0 break-all">{entry.path}</span>
                  {entry.leftOut && <span className="ml-auto shrink-0 pl-3 font-sans">Left out: {entry.leftOut}</span>}
                </div>
                {(fileErrors.length > 0 || fileWarnings.length > 0) && (
                  <ul className="mt-1.5 space-y-bc-1 pl-5 font-sans text-xs">
                    {fileErrors.map((e, i) => (
                      <li key={`e${i}`} className="text-destructive">
                        {e.message}
                      </li>
                    ))}
                    {fileWarnings.map((w, i) => (
                      <li key={`w${i}`} className="text-warning">
                        {w.message}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function IssueLine({ issue, error }: { issue: AgentPackageIssue; error: boolean }): React.JSX.Element {
  const Icon = error ? CircleAlert : TriangleAlert
  return (
    <li className={cn("flex items-start gap-2", error ? "text-destructive" : "text-warning")}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{issue.message}</span>
    </li>
  )
}

function groupByPath(issues: AgentPackageIssue[]): Map<string, AgentPackageIssue[]> {
  const map = new Map<string, AgentPackageIssue[]>()
  for (const issue of issues) {
    if (!issue.path) continue
    map.set(issue.path, [...(map.get(issue.path) ?? []), issue])
  }
  return map
}
