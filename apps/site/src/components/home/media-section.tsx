import Image from "next/image";
import { ArrowUpRight, Play, Youtube } from "lucide-react";
import { urls } from "@/config/site";
import { getLatestVideos } from "@/lib/youtube";
import { NewsletterForm } from "./newsletter-form";

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";

function videoDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

/**
 * Keep up with Hummingbot: the newsletter signup and the channel's latest
 * videos (The Bot Pod, hackathon recaps, tutorials), from YouTube's feed.
 */
export async function MediaSection() {
  const videos = await getLatestVideos(3);

  return (
    <section id="updates" className="w-full scroll-mt-16 border-b border-border py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <p className={`${kicker} mb-4 text-muted-foreground`}>Newsletter</p>
          <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
            Stay in the loop.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            Releases, new strategies, hackathon results and market making research, once a month.
          </p>
          <div className="mt-8 max-w-md">
            <NewsletterForm />
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className={`${kicker} text-muted-foreground`}>Latest on YouTube</p>
            <a
              href={urls.youtube}
              target="_blank"
              rel="noreferrer"
              className="-my-1 inline-flex items-center gap-1.5 py-1 text-sm font-semibold hover:underline"
            >
              <Youtube className="size-4" aria-hidden="true" /> Subscribe on YouTube
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          {videos.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-3">
              {videos.map((v) => (
                <li key={v.id}>
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hub-card group block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="relative block aspect-video overflow-hidden bg-muted">
                      <Image
                        src={v.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 18rem, (min-width: 640px) 33vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex size-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
                        </span>
                      </span>
                    </span>
                    <span className="block p-4">
                      <span className="line-clamp-2 text-sm font-semibold leading-snug">{v.title}</span>
                      <span className="mt-1.5 block text-xs text-muted-foreground">{videoDate(v.published)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <a
              href={urls.youtube}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-10 text-muted-foreground hover:text-foreground"
            >
              <Youtube className="size-5" aria-hidden="true" /> Tutorials, Demo Days and The Bot Pod on YouTube
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
