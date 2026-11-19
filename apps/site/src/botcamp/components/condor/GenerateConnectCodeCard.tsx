"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, Copy, KeyRound, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { alertColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"

interface GenerateConnectCodeCardProps {
  signedInAs: string
}

interface IssuedCode {
  code: string
  expiresAt: number
}

function remaining(expiresAt: number, now: number): string {
  const seconds = Math.max(0, Math.round((expiresAt - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

// Connect Condor with a code Botcamp gives (src/lib/connect-code.ts): one is
// generated as soon as the page opens, the person pastes it into Condor, and
// Condor trades it for its token. An expired code isn't replaced on its own,
// so an open tab doesn't keep a live code forever. The code lives in
// component state only — never in the URL.
export function GenerateConnectCodeCard({
  signedInAs,
}: GenerateConnectCodeCardProps): React.JSX.Element {
  const [issued, setIssued] = useState<IssuedCode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  // Once per mount: React's dev double-mount would otherwise make two codes.
  const requested = useRef(false)

  useEffect(() => {
    if (!issued) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [issued])

  const expired = issued !== null && now >= issued.expiresAt

  useEffect(() => {
    if (requested.current) return
    requested.current = true
    void generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, [])

  async function generate(): Promise<void> {
    setLoading(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch("/api/condor/connect-code", { method: "POST" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Something went wrong")
      setIssued({ code: body.data.code, expiresAt: new Date(body.data.expiresAt).getTime() })
      setNow(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function copy(): Promise<void> {
    if (!issued) return
    await navigator.clipboard.writeText(issued.code)
    setCopied(true)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">Connect Condor</p>
        <CardTitle>Get a Code for Condor</CardTitle>
        <CardDescription>
          Signed in as {signedInAs}. Paste this code in Condor under{" "}
          <span className="text-foreground">Agent Hub → Connect Botcamp</span>. It works once and expires in 10
          minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-bc-5">
        {issued && !expired ? (
          <div className="space-y-bc-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-bc-md border bg-muted px-3 py-2 text-center font-mono text-xl font-semibold tracking-[0.2em]">
                {issued.code}
              </code>
              <Button type="button" onClick={copy} variant="outline" aria-label="Copy code">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="font-mono text-xs text-muted-foreground">Expires in {remaining(issued.expiresAt, now)}</p>
          </div>
        ) : loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting your code…
          </p>
        ) : (
          <Button onClick={generate}>
            <KeyRound className="mr-2 h-4 w-4" />
            {expired ? "Get a New Code" : "Try Again"}
          </Button>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className={cn("rounded-bc-md px-3 py-2 text-xs", alertColors.warning)}>
          This code lets a Condor act as you. Paste it only into your own Condor — nobody from Botcamp will ever ask
          you for it. You get an email when it&apos;s used.
        </p>

        <Link href="/dashboard/profile?tab=condor" className="block text-sm text-muted-foreground hover:text-foreground">
          Manage connections
        </Link>
      </CardContent>
    </Card>
  )
}
