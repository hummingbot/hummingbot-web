import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/home/hero";
import { UsedBy } from "@/components/home/used-by";
import { WhatIsSection } from "@/components/home/what-is-section";
import { AgentsSection } from "@/components/home/agents-section";
import { BotcampSection } from "@/components/home/botcamp-section";
import { MediaSection } from "@/components/home/media-section";

/**
 * The home, in the order the team set (2026-11-23): install (Condor or the
 * Hummingbot client), what Hummingbot is (an open source framework for
 * market makers, not just algo trading), strategies (the library and the
 * hackathons they race in), education (Botcamp), and the newsletter and
 * YouTube. One idea per section.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <UsedBy />
        <WhatIsSection />
        <AgentsSection />
        <BotcampSection />
        <MediaSection />
      </main>
      <SiteFooter />
    </>
  );
}
