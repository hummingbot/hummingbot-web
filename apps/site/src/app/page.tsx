import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/home/hero";
import { UsedBy } from "@/components/home/used-by";
import { BuildCards } from "@/components/home/build-cards";
import { EcosystemGrid } from "@/components/home/ecosystem-grid";
import { VolumesStat } from "@/components/home/volumes-stat";
import { ExchangeGrid } from "@/components/home/exchange-grid";
import { TweetMarquee } from "@/components/home/tweet-marquee";
import { NewsletterDiscord } from "@/components/home/newsletter-discord";

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <UsedBy />
        <BuildCards />
        <EcosystemGrid />
        <VolumesStat />
        <ExchangeGrid />
        <TweetMarquee />
        <NewsletterDiscord />
      </main>
      <SiteFooter />
    </>
  );
}
