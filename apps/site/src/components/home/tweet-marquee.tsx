import { GradientText } from "@hummingbot/ui";
import testimonials from "@/content/testimonials.json";

type Testimonial = {
  name: string;
  handle: string;
  date: string;
  text: string;
  url: string;
};

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(iso),
  );

function TweetCard({ t }: { t: Testimonial }) {
  return (
    <a
      href={t.url}
      target="_blank"
      rel="noreferrer"
      className="block w-80 shrink-0 rounded-xl border border-ink-800 bg-card p-5 transition-colors hover:border-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{t.name}</p>
          <p className="truncate text-sm text-ink-500" translate="no">
            @{t.handle}
          </p>
        </div>
        <time className="shrink-0 text-xs tabular-nums text-ink-600" dateTime={t.date}>
          {fmtDate(t.date)}
        </time>
      </div>
      <p className="mt-3 line-clamp-4 text-sm text-ink-300 text-pretty">{t.text}</p>
    </a>
  );
}

function Row({
  items,
  reverse,
  duration,
}: {
  items: Testimonial[];
  reverse?: boolean;
  duration: string;
}) {
  return (
    <div className="hb-marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={`hb-marquee-track gap-4 py-2 ${reverse ? "hb-marquee-reverse" : ""}`}
        style={{ ["--hb-marquee-duration" as string]: duration }}
      >
        {[...items, ...items].map((t, i) => (
          <TweetCard key={`${t.handle}-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
}

export function TweetMarquee() {
  const all = testimonials as Testimonial[];
  const third = Math.ceil(all.length / 3);
  const rows = [all.slice(0, third), all.slice(third, third * 2), all.slice(third * 2)];

  return (
    <section className="py-20" aria-label="Community testimonials">
      <h2 className="mb-12 text-center text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        <GradientText>Market Makers love Hummingbot.</GradientText>
      </h2>
      <div className="flex flex-col gap-4">
        <Row items={rows[0]!} duration="64s" />
        <Row items={rows[1]!} reverse duration="72s" />
        <Row items={rows[2]!} duration="58s" />
      </div>
    </section>
  );
}
