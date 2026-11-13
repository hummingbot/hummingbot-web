"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Linkedin, Send, Share2, Twitter } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { cn } from "@/botcamp/lib/utils"

interface ShareRaceButtonsProps {
  /** Pre-written post; the link is appended by each network. */
  text: string
  /** Site path to share, e.g. "/hackathons/agent-builders-cup-1". */
  path: string
  /** "onColor" for use on a brand-colored TeamColorCard. */
  tone?: "default" | "onColor"
  label?: string
  /** "end" right-aligns the block, for a bottom-right corner placement. */
  align?: "start" | "end"
  size?: "sm" | "lg"
}

/**
 * One-click share to X, LinkedIn and Telegram with a pre-written post, plus
 * copy-to-clipboard and the device share sheet where the browser has one.
 */
export function ShareRaceButtons({
  text,
  path,
  tone = "default",
  label = "Share",
  align = "start",
  size = "sm",
}: ShareRaceButtonsProps) {
  const [origin, setOrigin] = useState("")
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setOrigin(window.location.origin)
    setCanNativeShare(typeof navigator.share === "function")
  }, [])

  const url = `${origin}${path}`
  const post = `${text} ${url}`
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)
  const networks = [
    { name: "X", icon: Twitter, href: `https://x.com/intent/post?text=${encodeURIComponent(post)}` },
    // share-offsite drops any text; the feed composer takes it pre-filled.
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(post)}`,
    },
    { name: "Telegram", icon: Send, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(post)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (permissions/insecure context) — nothing to recover.
    }
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ text, url })
    } catch {
      // User dismissed the share sheet.
    }
  }

  const buttonClass =
    tone === "onColor"
      ? "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
      : undefined

  return (
    <div className={cn(size === "lg" ? "space-y-bc-3" : "space-y-bc-2", align === "end" && "flex flex-col items-end")}>
      <p
        className={cn(
          "inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-[0.14em]",
          size === "lg" ? "text-xs" : "text-[10px]",
          tone === "onColor" ? "text-white/80" : "text-muted-foreground"
        )}
      >
        <Share2 className="h-3 w-3" />
        {label}
      </p>
      {/* The post each button opens with, so nobody shares blind. */}
      <p
        className={cn(
          "rounded-bc-md border leading-relaxed",
          size === "lg" ? "max-w-lg px-4 py-3 text-sm" : "max-w-md px-3 py-2 text-xs",
          tone === "onColor" ? "border-white/20 bg-black/20 text-white/85" : "border-border bg-background/60 text-muted-foreground"
        )}
      >
        {text}
      </p>
      <div className={cn("flex flex-wrap gap-2", align === "end" && "justify-end")}>
        {networks.map((n) => (
          <Button key={n.name} asChild size={size === "lg" ? "default" : "sm"} variant="outline" className={buttonClass}>
            <a href={n.href} target="_blank" rel="noopener noreferrer">
              <n.icon className="mr-1.5 h-3.5 w-3.5" />
              {n.name}
            </a>
          </Button>
        ))}
        <Button size={size === "lg" ? "default" : "sm"} variant="outline" className={buttonClass} onClick={copy}>
          {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy post"}
        </Button>
        {canNativeShare && (
          <Button size={size === "lg" ? "default" : "sm"} variant="outline" className={buttonClass} onClick={nativeShare}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            More
          </Button>
        )}
      </div>
    </div>
  )
}
