"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

export interface Connection {
  id: string
  name: string
  scopes: string[]
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

function isActive(c: Connection): boolean {
  return !c.expiresAt || new Date(c.expiresAt) > new Date()
}

// Whether Condor is connected to this account. Condor connects itself through
// "Connect Botcamp" (the device login at /connect); each active token is one
// Condor install, and disconnecting one revokes its token.
export function CondorConnectionCard({
  initialConnections,
}: {
  /** Read-only preview: this user's tokens, read on the server (Botcamp fetches /api/user/api-tokens). */
  initialConnections: Connection[]
}): React.JSX.Element {
  const [connections, setConnections] = useState<Connection[] | null>(() => initialConnections.filter(isActive))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)


  const handleDisconnect = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/user/api-tokens/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setConnections((prev) => (prev ?? []).filter((c) => c.id !== id))
    } catch {
      setError("Failed to disconnect")
    } finally {
      setBusyId(null)
    }
  }

  const connected = !!connections && connections.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Condor</CardTitle>
          {connections && (
            <span
              className={cn(
                "flex items-center gap-2 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider",
                connected ? "border-botcamp-amber/40 text-botcamp-amber" : "text-muted-foreground",
              )}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-botcamp-amber" : "bg-muted-foreground")}
              />
              {connected ? "Connected" : "Not connected"}
            </span>
          )}
        </div>
        <CardDescription>
          {connected
            ? "Condor can clone the agents you can read on Botcamp and publish your agents for review. A connection lasts 90 days; after that, connect again from Condor. Disconnect an install to cut its access."
            : "In Condor, open the Hub and choose Connect Botcamp. Enter the code it shows at botcamp.xyz/connect, signed in here."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {connections === null && !error && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

        {connected && (
          <ul className="divide-y divide-border rounded-bc-md border">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{c.name}</span>
                    {!c.scopes.includes("agents:publish") && (
                      <span className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Read only
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    connected {new Date(c.createdAt).toLocaleDateString()} ·{" "}
                    {c.lastUsedAt ? `last used ${new Date(c.lastUsedAt).toLocaleDateString()}` : "never used"}
                    {c.expiresAt && ` · expires ${new Date(c.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <ReadOnlyHint><Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(c.id)}
                  disabled>
                  {busyId === c.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Disconnect
                </Button></ReadOnlyHint>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
