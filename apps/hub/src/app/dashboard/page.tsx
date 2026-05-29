import { Github } from "lucide-react";
import { Button } from "@hummingbot/ui";
import { HubFooter, HubHeader } from "@/components/hub-shell";

export const metadata = { title: "Dashboard — Hummingbot Hub" };

/**
 * Owner dashboard — publish/yank, API tokens, scan-held visibility.
 * Gated by GitHub OAuth (not yet wired; see PLAN §5.3). Placeholder until
 * auth + the publish API land.
 */
export default function DashboardPage() {
  return (
    <>
      <HubHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Publisher dashboard</h1>
        <p className="mt-3 max-w-md text-pretty text-ink-400">
          Sign in with GitHub to publish primitives, manage versions, mint CLI
          tokens, and see scan status for your releases.
        </p>
        <Button size="lg" className="mt-6" disabled>
          <Github className="size-4" aria-hidden="true" />
          Sign in with GitHub
        </Button>
        <p className="mt-3 text-xs text-ink-600">
          Auth &amp; publishing are coming soon. Today, strategies are imported
          from Botcamp.
        </p>
      </main>
      <HubFooter />
    </>
  );
}
