"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/botcamp/components/ui/button"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/botcamp/components/ui/dialog"

// Pending legal review before this is treated as final (see
// hummingbot/botcamp-site#32). Section 2 mirrors the hackathon/competition
// submission license in the full Terms of Service (botcamp.xyz/terms, §5(b)).
const TERMS_BODY = `**1. Eligibility**

Participation in the Agent Builders Cup is open to anyone 18 years or older who registers with a valid account. Employees of Hummingbot Foundation and its sponsors involved in judging are not eligible to win prizes.

**2. Your Submission**

By registering for or participating in this hackathon, you grant Botcamp, Inc. a worldwide, non-exclusive, perpetual, irrevocable, royalty-free, transferable, and sublicensable license to use, reproduce, distribute, publicly display, publish, adapt, and create derivative works from the content you submit — including strategy code, configurations, descriptions, documentation, flowcharts, performance data, and demo videos — for any purpose, including publication on Botcamp websites, educational materials, and marketing. You retain ownership of your submissions. You represent and warrant that you have all rights necessary to grant this license and that your submissions do not infringe any third party's intellectual property rights.

**3. Trading Risk**

Agents built for this competition may execute real trades on real exchanges using funds provided by the organizers. You are responsible for the behavior of any code you submit. Botcamp and its sponsors are not liable for losses resulting from bugs, unexpected market conditions, or misuse.

**4. Fair Play**

Any attempt to manipulate scoring, exploit exchange or platform bugs, coordinate wash trading, or otherwise act in bad faith will result in disqualification at the sole discretion of the organizers.

**5. Prizes**

Prize amounts and structure are described on the hackathon page and may be adjusted by the organizers before the competition concludes. Prizes are distributed at the organizers' discretion based on final rankings and judging criteria.

**6. Publicity**

You agree that your name, builder profile, and submitted agent's performance may be featured on Botcamp's website and promotional materials related to this competition.

**7. Full Terms of Service**

This hackathon is also governed by Botcamp's full [Terms of Service](/terms), including the sections on educational content, trading risk disclaimers, and dispute resolution. In the event of a conflict, these hackathon-specific terms control for this program.

**8. Changes to These Terms**

The organizers may update these terms during the competition. Material changes will be communicated to registered participants.

**9. Contact**

Questions about these terms can be directed to operations@botcamp.xyz or the Botcamp team via the official Telegram or Discord channels.`

interface TermsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgree: () => void
}

export function TermsDialog({ open, onOpenChange, onAgree }: TermsDialogProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Reset the scroll gate each time the dialog opens, and skip it entirely
  // if the terms are short enough to already fit without scrolling.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setScrolledToBottom(false)
    const el = bodyRef.current
    if (el && el.scrollHeight <= el.clientHeight + 8) {
      setScrolledToBottom(true)
    }
  }, [open])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledToBottom(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
        </DialogHeader>
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto border-y border-border py-4 pr-2 text-sm text-muted-foreground"
        >
          <MarkdownContent content={TERMS_BODY} className="prose-sm" />
        </div>
        <DialogFooter>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!scrolledToBottom}
            onClick={() => {
              onAgree()
              onOpenChange(false)
            }}
          >
            {scrolledToBottom ? "I Agree" : "Scroll to the bottom to continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
