"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  MonitorDown,
  PackageCheck,
  X,
} from "lucide-react";
import { cn } from "@hummingbot/ui";
import { CondorInstall } from "@/components/condor/condor-install";

const ACCEPTED_KEY = "hb-condor-clone-accepted";
// "yes" / "no": whether this browser said it has Condor. The site can't
// detect it (Condor runs on the user's own machine), so it asks once.
const HAS_CONDOR_KEY = "hb-has-condor";

/**
 * "Clone to Condor", as on Botcamp: Condor pulls agents from its Hub
 * (Hub › Pull agents), looking them up by slug, so the slug is what you copy.
 * The slug shows once the disclaimer is ticked.
 *
 * First it asks whether you have Condor: if not, it shows how to install it
 * right there (the same CondorInstall as the get-started guide), so the agent you picked
 * stays on screen. The answer is remembered in this browser.
 *
 * The tick is remembered in this browser only. Botcamp records it on the
 * account (POST /api/user/condor-terms) and refuses the download until it is;
 * that moves here once accounts do.
 */
export function CloneToCondor({
  slug,
  version,
  name,
  connectUrl,
  size = "md",
  label = "Clone to Condor",
}: {
  slug: string;
  version: number;
  name: string;
  connectUrl: string;
  size?: "sm" | "md";
  /** Button text; the dialog always says "Clone to Condor". */
  label?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [accepted, setAccepted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasCondor, setHasCondor] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const has = localStorage.getItem(HAS_CONDOR_KEY);
      if (has === "yes" || has === "no") {
        const id = requestAnimationFrame(() => setHasCondor(has === "yes"));
        return () => cancelAnimationFrame(id);
      }
    } catch {
      // storage unavailable: ask again
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(ACCEPTED_KEY) === "1") {
        const id = requestAnimationFrame(() => setAccepted(true));
        return () => cancelAnimationFrame(id);
      }
    } catch {
      // storage unavailable: ask again
    }
  }, []);

  const accept = () => {
    setAccepted(true);
    try {
      localStorage.setItem(ACCEPTED_KEY, "1");
    } catch {
      // still accepted for this visit
    }
  };

  const answer = (has: boolean) => {
    setHasCondor(has);
    try {
      localStorage.setItem(HAS_CONDOR_KEY, has ? "yes" : "no");
    } catch {
      // remembered for this visit only
    }
  };

  // Back to "Do you already have Condor?": forget the remembered answer.
  const chooseAgain = () => {
    setHasCondor(null);
    try {
      localStorage.removeItem(HAS_CONDOR_KEY);
    } catch {
      // nothing stored
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(slug);
    setCopied(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCopied(false);
          dialog.current?.showModal();
        }}
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-5 text-sm",
        )}
      >
        <Download
          className={cn("mr-2", size === "sm" ? "size-3.5" : "size-4")}
          aria-hidden="true"
        />
        {label}
        {label !== "Clone to Condor" && (
          <span className="sr-only"> {name} to Condor</span>
        )}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`clone-${slug}-title`}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-3">
            <Image
              src="/brand/marks/condor-logo-square.png"
              alt=""
              width={40}
              height={40}
              className="shrink-0 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <h2
                id={`clone-${slug}-title`}
                className="text-lg font-semibold tracking-tight"
              >
                Clone to Condor
              </h2>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground">{name}</span> v{version}{" "}
                passed review.{" "}
                {hasCondor === false
                  ? "Install Condor first, then pull it from Condor's Hub."
                  : "Pull it into your own Condor from the Hub."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {hasCondor === null && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Do you already have Condor installed?
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => answer(true)}
                  className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60"
                >
                  <PackageCheck
                    className="size-5 text-primary"
                    aria-hidden="true"
                  />
                  <span className="font-semibold">Yes, I have Condor</span>
                  <span className="text-xs text-muted-foreground">
                    Show me how to pull this agent.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => answer(false)}
                  className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60"
                >
                  <MonitorDown
                    className="size-5 text-primary"
                    aria-hidden="true"
                  />
                  <span className="font-semibold">Not yet</span>
                  <span className="text-xs text-muted-foreground">
                    Install it first. One command, on your own machine.
                  </span>
                </button>
              </div>
            </div>
          )}

          {hasCondor === false && (
            <div className="space-y-4">
              <CondorInstall compact />
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={chooseAgain}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => answer(true)}
                  className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  I&apos;ve installed it: pull the agent
                </button>
              </div>
            </div>
          )}

          {hasCondor === true && (
            <>
              <ol className="space-y-3 text-sm text-muted-foreground">
                {[
                  <>
                    In Condor&apos;s dashboard, open{" "}
                    <span className="text-foreground">Hub → Pull agents</span>.
                    If it asks, connect your account and approve the code at{" "}
                    <a
                      href={connectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      /connect
                    </a>
                    .
                  </>,
                  <>
                    Find the agent in the catalogue, or open{" "}
                    <span className="text-foreground">Look up by slug</span> and
                    paste the slug below.
                  </>,
                  <>
                    Review what&apos;s in it and install. Routines and skills
                    arrive switched off; nothing runs until you turn them on.
                  </>,
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-5 shrink-0 font-mono text-xs font-bold text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="space-y-3 rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-xs leading-relaxed">
                <p className="text-foreground/90">
                  This is someone else&apos;s code. This version was reviewed
                  once, which is no guarantee it&apos;s safe or profitable. Read
                  the code and each routine before you switch it on, and try it
                  without real funds first. You&apos;re responsible for what it
                  does with your exchange keys.
                </p>
                {accepted ? (
                  <p className="flex items-center gap-2 text-foreground">
                    <Check className="size-4 text-primary" aria-hidden="true" />
                    You accepted this. It covers every agent you clone.
                  </p>
                ) : (
                  <label className="flex cursor-pointer items-start gap-2 text-foreground">
                    <input
                      type="checkbox"
                      onChange={(e) => e.target.checked && accept()}
                      className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
                    />
                    I understand, and I&apos;ll review every agent before
                    running it.
                  </label>
                )}
              </div>

              {accepted && (
                <div className="space-y-1.5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Agent slug
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 font-mono text-xs">
                      {slug}
                    </code>
                    <button
                      type="button"
                      onClick={copy}
                      className="inline-flex h-9 shrink-0 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      {copied ? (
                        <Check className="mr-1.5 size-4" aria-hidden="true" />
                      ) : (
                        <Copy className="mr-1.5 size-4" aria-hidden="true" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="sr-only" aria-live="polite">
                    {copied ? "Slug copied" : ""}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={chooseAgain}
                className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Back · Don&apos;t have Condor yet?
              </button>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
