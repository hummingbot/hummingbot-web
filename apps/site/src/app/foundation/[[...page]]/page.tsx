import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPageView } from "@/components/sections/section-page-view";
import { SECTIONS, getSectionPage } from "@/lib/sections";

type Params = { params: Promise<{ page?: string[] }> };

export function generateStaticParams() {
  return SECTIONS.foundation.pages.map((p) => ({ page: p.slug ? [p.slug] : [] }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page = [] } = await params;
  const loaded = getSectionPage("foundation", page.join("/"));
  return loaded ? { title: `${loaded.def.title} — Hummingbot Foundation` } : {};
}

export default async function FoundationPage({ params }: Params) {
  const { page = [] } = await params;
  const loaded = page.length <= 1 ? getSectionPage("foundation", page.join("/")) : null;
  if (!loaded) notFound();
  return <SectionPageView loaded={loaded} />;
}
