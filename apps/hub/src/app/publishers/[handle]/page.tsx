import { notFound } from "next/navigation";
import { HubFooter, HubHeader } from "@/components/hub-shell";
import { PrimitiveCard } from "@/components/primitive-card";
import data from "@/content/registry.json";
import { getPublisher, primitivesByPublisher } from "@/lib/registry";
import { fmtDate } from "@/lib/types";

export function generateStaticParams() {
  return (data.publishers as { handle: string }[]).map((p) => ({ handle: p.handle }));
}

export default async function PublisherPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const pub = getPublisher(handle);
  if (!pub) notFound();
  const items = primitivesByPublisher(handle).sort((a, b) => b.updated.localeCompare(a.updated));

  return (
    <>
      <HubHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <header className="border-b border-ink-800 pb-8">
          <h1 className="text-3xl font-bold tracking-tight">{pub.name}</h1>
          <p className="mt-1 text-ink-500" translate="no">@{pub.handle}</p>
          {pub.bio && <p className="mt-3 max-w-2xl text-pretty text-ink-300">{pub.bio}</p>}
          <p className="mt-3 text-sm text-ink-600">
            {items.length} {items.length === 1 ? "primitive" : "primitives"} · joined {fmtDate(pub.joined)}
          </p>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((p) => (
            <PrimitiveCard key={`${p.namespace}/${p.name}`} p={p} />
          ))}
        </div>
      </main>
      <HubFooter />
    </>
  );
}
