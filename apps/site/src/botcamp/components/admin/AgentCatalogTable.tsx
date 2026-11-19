"use client"

import { Fragment, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Eye, EyeOff, ExternalLink, Loader2, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/botcamp/components/ui/alert-dialog"
import { Badge } from "@/botcamp/components/ui/badge"
import { Button } from "@/botcamp/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/botcamp/components/ui/dropdown-menu"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { Input } from "@/botcamp/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/botcamp/components/ui/table"
import { AgentVersionStatusBadge } from "@/botcamp/components/agents/AgentVersionStatusBadge"
import { alertColors } from "@/botcamp/lib/design-constants"
import { formatDate } from "@/botcamp/lib/format"
import { cn } from "@/botcamp/lib/utils"

export interface AgentCatalogVersion {
  id: string
  version: number
  status: string
  source: string
  fileCount: number
  uploader: string
  createdAt: string
}

export interface AgentCatalogRow {
  strategyId: number
  title: string
  slug: string
  /** PRIVATE: out of Condor's catalogue, and only its authors and admins can pull it. */
  isPrivate: boolean
  /** Why Condor's catalogue leaves it out ("private", "controller page"), or null when it's listed. */
  notListed: string | null
  authors: string
  /** Newest first; every status, so the history is visible next to what Condor serves. */
  versions: AgentCatalogVersion[]
}

interface AgentCatalogTableProps {
  agents: AgentCatalogRow[]
}

// The Condor Ready tab: one row per agent (what Condor's catalogue lists), with its
// versions folded underneath. The review queues stay one row per version.
export function AgentCatalogTable({ agents }: AgentCatalogTableProps): React.JSX.Element {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<Set<number>>(new Set())
  const router = useRouter()
  // Deleting is for good: the page and every version go, and Condor's slug
  // lookups stop finding it. So it asks for the slug typed back.
  const [deleting, setDeleting] = useState<AgentCatalogRow | null>(null)
  const [typedSlug, setTypedSlug] = useState("")
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Taking an agent out of Condor without deleting it: the page goes PRIVATE,
  // so the catalogue drops it and only its authors and admins can pull it.
  // The one way out for an agent that raced (its race records block a delete),
  // and undone by making it public again.
  const [hiding, setHiding] = useState<AgentCatalogRow | null>(null)
  const [hideError, setHideError] = useState<string | null>(null)

  const askHide = (agent: AgentCatalogRow): void => {
    setHiding(agent)
    setHideError(null)
  }

  const confirmHide = async (): Promise<void> => {
    if (!hiding) return
    setBusy(true)
    setHideError(null)
    try {
      const res = await fetch(`/api/admin/strategies/${hiding.strategyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: hiding.isPrivate ? "PUBLIC" : "PRIVATE" }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to update the agent")
      }
      setHiding(null)
      router.refresh()
    } catch (err) {
      setHideError(err instanceof Error ? err.message : "Failed to update the agent")
    } finally {
      setBusy(false)
    }
  }

  const askDelete = (agent: AgentCatalogRow): void => {
    setDeleting(agent)
    setTypedSlug("")
    setDeleteError(null)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!deleting) return
    setBusy(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/strategies/${deleting.strategyId}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to delete the agent")
      }
      setDeleting(null)
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete the agent")
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return agents
    return agents.filter((a) => `${a.title} ${a.slug} ${a.authors}`.toLowerCase().includes(q))
  }, [agents, query])

  const toggle = (id: number): void =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (agents.length === 0) {
    return <EmptyState icon="🤖" title="Nothing here" description="No agent has an approved version yet." />
  }

  return (
    <div className="space-y-bc-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search agents or authors..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Agent</TableHead>
            <TableHead>Serving</TableHead>
            <TableHead>Versions</TableHead>
            <TableHead>Last Approved</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((agent) => {
            const approved = agent.versions.filter((v) => v.status === "APPROVED")
            const latest = approved[0]
            const isOpen = open.has(agent.strategyId)
            return (
              <Fragment key={agent.strategyId}>
                <TableRow className="cursor-pointer" onClick={() => toggle(agent.strategyId)}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(agent.strategyId)
                      }}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Hide" : "Show"} versions of ${agent.title}`}
                      className="rounded-bc-sm p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agent.title}</span>
                      {agent.notListed && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not listed · {agent.notListed}
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{agent.slug}</p>
                    {agent.authors && <p className="text-xs text-muted-foreground">{agent.authors}</p>}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">v{latest?.version}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {approved.length} approved
                      {agent.versions.length > approved.length && (
                        <span className="text-muted-foreground"> · {agent.versions.length} total</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{latest ? formatDate(latest.createdAt) : "—"}</span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${agent.title}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/hub/${agent.slug}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Page
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/strategies/${agent.strategyId}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Strategy
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => askHide(agent)}>
                          {agent.isPrivate ? (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Put Back in Condor
                            </>
                          ) : (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Remove from Condor
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => askDelete(agent)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Agent
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>

                {isOpen &&
                  agent.versions.map((v) => (
                    <TableRow key={v.id} className="bg-muted/30 hover:bg-muted/50">
                      <TableCell />
                      <TableCell colSpan={5} className="py-2">
                        <Link
                          href={`/admin/agents/${v.id}`}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                        >
                          <span className="w-10 font-mono">v{v.version}</span>
                          <AgentVersionStatusBadge status={v.status} />
                          <span className="font-mono text-xs text-muted-foreground">
                            {v.source.toLowerCase()} · {v.fileCount} files
                          </span>
                          <span className="text-muted-foreground">{v.uploader}</span>
                          <span className="text-muted-foreground">{formatDate(v.createdAt)}</span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>

      {query && (
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {agents.length} agents
        </p>
      )}

      <AlertDialog open={hiding !== null} onOpenChange={(o) => !o && !busy && setHiding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hiding?.isPrivate ? `Put ${hiding.title} back in Condor?` : `Remove ${hiding?.title} from Condor?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hiding?.isPrivate
                ? "Its page becomes public again, so Condor lists it and people can pull its latest approved version. Its author may have made it private on purpose — check before putting it back."
                : "Its page becomes private: Condor stops listing it and only its authors and admins can pull it. Copies already installed keep running, and Condor marks them as delisted. Nothing is deleted, and you can put it back."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {hideError && <p className={cn("rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>{hideError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button onClick={confirmHide} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hiding?.isPrivate ? "Put Back in Condor" : "Remove from Condor"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This deletes the agent's page and all ${deleting?.versions.length ?? 0} of its versions. Condor stops listing it, and looking up "${deleting?.slug}" won't find it. Copies people already cloned keep running. This can't be undone — to only take it out of Condor, use Remove from Condor. An agent that raced in a hackathon can't be deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-bc-2">
            <label htmlFor="confirm-slug" className="text-sm">
              Type <span className="font-mono">{deleting?.slug}</span> to confirm
            </label>
            <Input
              id="confirm-slug"
              value={typedSlug}
              onChange={(e) => setTypedSlug(e.target.value)}
              autoComplete="off"
              className="font-mono"
            />
          </div>
          {deleteError && <p className={cn("rounded-bc-md px-3 py-2 text-sm", alertColors.error)}>{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={busy || typedSlug.trim() !== deleting?.slug}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Agent
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
