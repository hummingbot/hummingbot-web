import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { urls } from "@/config/site";
import { getBotcampIntro, type BotcampIntro } from "@/lib/home-data";
import { CourseCarousel } from "./course-carousel";

function monthYear(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

/**
 * Botcamp on the home: a full-bleed band with a gold glow (it follows the
 * theme), the next cohort's number set huge in Monoton behind the pitch, and
 * the courses every cohort includes in a carousel.
 */
export async function BotcampSection() {
  const intro: BotcampIntro | null = await getBotcampIntro().catch(() => null);
  if (!intro) return null;
  const { nextCohort, courses, stats } = intro;

  const headline =
    nextCohort.status === "active"
      ? `Cohort ${nextCohort.number} is in session.`
      : nextCohort.startDate
        ? `Cohort ${nextCohort.number} starts ${monthYear(nextCohort.startDate)}.`
        : `Cohort ${nextCohort.number} is coming.`;

  return (
    <section id="botcamp" className="relative w-full scroll-mt-16 overflow-hidden border-b border-border py-20 md:py-28">
      {/* Gold glow and the cohort number, behind everything */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 78% 30%, hsl(var(--primary) / 0.16), transparent 70%), radial-gradient(ellipse 50% 60% at 10% 100%, hsl(var(--primary) / 0.06), transparent 70%)",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 right-[-2rem] select-none font-monoton text-[16rem] leading-none text-[hsl(var(--primary)/0.25)] md:right-8 [[data-theme=light]_&]:text-[hsl(var(--primary)/0.3)] md:text-[22rem] lg:text-[28rem]"
      >
        {nextCohort.number}
      </span>

      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Botcamp</p>
          <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-6xl">{headline}</h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            Learn to build your own trading agent in live weekly sessions, taught by the team that built Hummingbot.
            Get it reviewed and certify it at Demo Day.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={urls.botcamp}
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Reserve your seat <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
            <Link
              href={urls.botcamp}
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background/60 px-6 text-base font-medium backdrop-blur-sm transition-colors hover:bg-muted"
            >
              Explore Botcamp
            </Link>
          </div>
          <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              <strong className="font-semibold tabular-nums text-foreground">{stats.members}</strong> members
            </span>
            <span>
              <strong className="font-semibold tabular-nums text-foreground">{stats.certified}</strong> certified strategies
            </span>
            <span>
              <strong className="font-semibold tabular-nums text-foreground">{stats.cohorts}</strong> cohorts since 2022
            </span>
          </p>
        </div>

        <div className="mt-16 md:mt-20">
          <CourseCarousel courses={courses} href={urls.botcamp} />
        </div>
      </div>
    </section>
  );
}
