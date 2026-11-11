import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/home/hero";
import { UsedBy } from "@/components/home/used-by";
import { HummingbotStackSection } from "@/components/home/hummingbot-stack-section";
import { BotcampSection } from "@/components/home/botcamp-section";
import { InstallSection } from "@/components/home/install-section";
import { ExchangeGrid } from "@/components/home/exchange-grid";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { CommunitySection } from "@/components/home/community-section";

/**
 * The home: clone a strategy (hero) and install Condor to run it, the
 * Hummingbot stack underneath, learn to build your own (Botcamp), the
 * exchanges it trades on, what market makers say, and the community.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <UsedBy />
        <InstallSection />
        <HummingbotStackSection />
        <BotcampSection />
        <ExchangeGrid />
        <TestimonialsSection />
        <CommunitySection />
      </main>
      <SiteFooter />
    </>
  );
}
