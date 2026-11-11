import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPageView } from "@/components/sections/section-page-view";
import { SECTIONS, getSectionPage } from "@/lib/sections";

type Params = { params: Promise<{ page?: string[] }> };

export function generateStaticParams() {
  return SECTIONS.bounties.pages.map((p) => ({ page: p.slug ? [p.slug] : [] }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page = [] } = await params;
  const loaded = getSectionPage("bounties", page.join("/"));
  return loaded ? { title: `${loaded.def.title} — Hummingbot Bounties` } : {};
}

export default async function BountiesPage({ params }: Params) {
  const { page = [] } = await params;
  const loaded = page.length <= 1 ? getSectionPage("bounties", page.join("/")) : null;
  if (!loaded) notFound();
  return <SectionPageView loaded={loaded} />;
}
