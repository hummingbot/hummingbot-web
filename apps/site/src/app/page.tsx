import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/home/hero";
import { UsedBy } from "@/components/home/used-by";
import { WhatIsSection } from "@/components/home/what-is-section";
import { HubSection } from "@/components/home/hub-section";
import { EducationSection } from "@/components/home/education-section";
import { MediaSection } from "@/components/home/media-section";

/**
 * The home, in the order the team set: install (Condor or the Hummingbot
 * client), what Hummingbot is (an open source framework for market makers),
 * strategies (the Hub), education (Botcamp), and the newsletter and YouTube.
 * One idea per section, in the design the unified site will use.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col">
        <Hero />
        <UsedBy />
        <WhatIsSection />
        <HubSection />
        <EducationSection />
        <MediaSection />
      </main>
      <SiteFooter />
    </>
  );
}
