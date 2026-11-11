/* eslint-disable @next/next/no-img-element */
import { Quote } from "lucide-react";
import { ThemedLogo } from "@/components/ui/themed-logo";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  href?: string;
  /** A logo pair under /brand/logos, or a light-on-black JPG under /brand/testimonials. */
  logo?: { dark: string; light: string; alt: string } | { jpg: string; alt: string };
};

// The market maker testimonials on hummingbot.org's home, word for word.
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "As the company that open-sourced Hummingbot, we're incredibly proud of how the community has embraced it. Today, we run bespoke strategies for our institutional clients using many custom Hummingbot instances.",
    name: "Jason Tomlinson",
    role: "Market Maker",
    href: "https://www.linkedin.com/in/jason-tomlinson-88b0b78/",
    logo: { dark: "coinalpha-dark.png", light: "coinalpha-light.png", alt: "CoinAlpha" },
  },
  {
    quote:
      "We started with Hummingbot as the foundation for our market-making business. Their WebSocket connector architecture is the most accessible in the market. We still use it from time to time and enjoy their great documentation.",
    name: "Eugene Tartakovsky",
    role: "Market Maker",
    href: "https://www.linkedin.com/in/etartakovsky/",
    logo: { jpg: "3jane-2.jpg", alt: "3Jane" },
  },
  {
    quote:
      "Hummingbot has served as a reliable base for us to build custom tools and strategies. It has many quality connectors and all components are well thought out, allowing us to flexibly modify the open source code.",
    name: "Jelle Buth",
    role: "Market Maker",
    href: "https://www.linkedin.com/in/jelle-buth/",
    logo: { jpg: "enclave.jpg", alt: "Enflux" },
  },
  {
    quote:
      "Hummingbot allowed me to run profitable strategies and generate $2 billion in trade volume. I can't recommend Hummingbot enough for any algo trader seeking a 0 to 1 platform.",
    name: "Kollan",
    role: "Prop Trader",
    href: "https://summitoperations.co/",
  },
  {
    quote:
      "Hummingbot revolutionized my crypto trading. Using advanced strategies, I developed my own trading style and consistently ranked at the top of the Miner leaderboard for months.",
    name: "Wojak",
    role: "Prop Trader",
    href: "https://github.com/mlguys",
  },
  {
    quote:
      "Since 2021, I've been a dedicated user of Hummingbot, primarily utilizing the pure market making strategy. Based on my profitable strategies, I started an algo-trading startup in Saudi Arabia!",
    name: "Hyder",
    role: "Prop Trader",
  },
];

function Logo({ logo }: { logo: NonNullable<Testimonial["logo"]> }) {
  if ("jpg" in logo) {
    // Light ink on a black JPG: screen drops the black on the dark theme; on the
    // light one, invert + hue-rotate keeps the colors and multiply drops the white.
    return (
      <img
        src={`/brand/testimonials/${logo.jpg}`}
        alt={logo.alt}
        loading="lazy"
        className="h-7 w-auto mix-blend-screen [[data-theme=light]_&]:mix-blend-multiply [[data-theme=light]_&]:[filter:invert(1)_hue-rotate(180deg)]"
      />
    );
  }
  return <ThemedLogo dark={logo.dark} light={logo.light} alt={logo.alt} className="h-10 w-auto" />;
}

/** Market maker testimonials, as on hummingbot.org, in the site's card style. */
export function TestimonialsSection() {
  return (
    <section id="testimonials" className="w-full scroll-mt-16 border-b border-border py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Testimonials
          </p>
          <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
            Market makers run Hummingbot.
          </h2>
        </div>

        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <li key={t.name} className="hub-card flex flex-col rounded-2xl border border-border bg-card p-7">
              <Quote className="size-6 fill-primary text-primary" aria-hidden="true" />
              <blockquote className="mt-4 flex-1 text-pretty text-base leading-relaxed text-foreground/85">
                {t.quote}
              </blockquote>
              <div className="mt-6 flex items-end justify-between gap-4 border-t border-border pt-5">
                <div className="min-w-0">
                  {t.href ? (
                    <a
                      href={t.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {t.name}
                    </a>
                  ) : (
                    <p className="font-semibold">{t.name}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
                {t.logo && <Logo logo={t.logo} />}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
