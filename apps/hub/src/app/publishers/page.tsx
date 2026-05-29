import Link from "next/link";
import { HubFooter, HubHeader } from "@/components/hub-shell";
import { allPublishers } from "@/lib/registry";

export const metadata = { title: "Publishers — Hummingbot Hub" };

export default function PublishersPage() {
  const pubs = allPublishers();
  return (
    <>
      <HubHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Publishers</h1>
        <p className="mt-1 text-sm text-ink-500">{pubs.length} publishers</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pubs.map((p) => (
            <Link
              key={p.handle}
              href={`/publishers/${p.handle}`}
              className="rounded-xl border border-ink-800 bg-card p-5 transition-colors hover:border-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-ink-500" translate="no">@{p.handle}</p>
              <p className="mt-3 text-xs tabular-nums text-ink-600">
                {p.count} {p.count === 1 ? "primitive" : "primitives"}
              </p>
            </Link>
          ))}
        </div>
      </main>
      <HubFooter />
    </>
  );
}
