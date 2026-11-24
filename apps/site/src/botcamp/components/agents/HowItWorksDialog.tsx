"use client"

import Link from "next/link"
import { ArrowRight, Download } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/botcamp/components/ui/dialog"

const CONDOR_URL = "https://condor.hummingbot.org"

const RUN_STEPS = [
  {
    title: "Pick an Agent",
    body: "Read what it trades and how, watch the demo, and look through its code on the agent page.",
  },
  {
    title: "Connect Condor",
    body: "In Condor, open the Hub and choose Connect Botcamp. Enter the code it shows at botcamp.xyz/connect.",
  },
  {
    title: "Clone and Run",
    body: "Pull the agent from the Hub, add your exchange keys and start it. It runs on your account, with your capital.",
  },
]

const PUBLISH_STEPS = [
  {
    title: "Upload Its Folder",
    body: "Create Condor Agent on Botcamp and drop in your agent's folder, or publish it straight from Condor's Hub.",
  },
  {
    title: "Get It Reviewed",
    body: "It's checked right away, then an AI review and a Botcamp admin look it over. You'll get an email at each step.",
  },
  {
    title: "Condor Ready",
    body: "Once approved, its page goes public and anyone with access can clone it from Condor's Hub.",
  },
]

function Steps({ steps }: { steps: { title: string; body: string }[] }): React.JSX.Element {
  return (
    <ol className="grid gap-px overflow-hidden rounded-bc-lg border border-border bg-border sm:grid-cols-3">
      {steps.map((step, i) => (
        <li key={step.title} className="bg-card p-4">
          <span className="font-mono text-xs tabular-nums text-condor-gold-deep dark:text-condor-gold">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h4 className="mt-2 text-sm font-semibold tracking-[-0.01em]">{step.title}</h4>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
        </li>
      ))}
    </ol>
  )
}

/**
 * How Condor agents work with Botcamp — running one and publishing your own —
 * in a dialog, opened by its own button. Used on /strategies and the
 * dashboard's Condor agent card.
 */
export function HowItWorksDialog({
  variant = "outline",
}: {
  variant?: "default" | "outline" | "ghost"
}): React.JSX.Element {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={variant}>
          How It Works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importing and Publishing Strategies</DialogTitle>
          <DialogDescription>
            Condor is the open-source app that runs these agents with Hummingbot. Agents are built by Botcamp members
            and reviewed before anyone can clone them.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-bc-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Import an Agent
          </p>
          <Steps steps={RUN_STEPS} />
          <p className="text-xs text-muted-foreground">
            You need a Botcamp account to clone; some agents also need a membership.{" "}
            <a
              href={CONDOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-condor-gold-deep hover:underline dark:text-condor-gold"
            >
              Get Condor
              <ArrowRight className="h-3 w-3" />
            </a>
          </p>
        </section>

        <section className="space-y-bc-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Publish Yours
          </p>
          <Steps steps={PUBLISH_STEPS} />
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/agents/new">Create Condor Agent</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/agent-starter" download>
                <Download className="mr-2 h-4 w-4" />
                Download the Starter Agent
              </a>
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  )
}
