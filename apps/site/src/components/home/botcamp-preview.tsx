import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { urls } from "@/config/site";

// Placeholder content until this reads Botcamp's cohorts/courses/hackathons.
const nextCohort = {
  number: "15",
  title: "Cohort 15: [Cohort Theme]",
  dates: "[Start] – [End]",
  body: "[N] weeks of live sessions. Build and certify your own strategy with feedback from instructors.",
  price: "[Price]",
};

const hackathon = {
  title: "Agent Builders Cup",
  stage: "[Stage]",
  body: "Build a Condor agent, get picked by a sponsor squad, and race it live with real capital.",
  stats: [
    { value: "[Prize]", label: "Prize pool" },
    { value: "[N]", label: "Sponsor squads" },
    { value: "[Date]", label: "Race starts" },
  ],
};

const courses = [
  { level: "Basic", title: "[Course title]", meta: "[N] lessons · self-paced" },
  { level: "Intermediate", title: "[Course title]", meta: "[N] lessons · self-paced" },
  { level: "Advanced", title: "[Course title]", meta: "[N] lessons · self-paced" },
];

const kicker = "font-mono text-[11px] font-bold uppercase tracking-[0.18em]";
const card =
  "rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg";

/** Botcamp, Hummingbot's education program, surfaced on the home page. */
export function BotcampPreview() {
  return (
    <section className="w-full py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className={`${kicker} mb-3 text-primary`}>Botcamp</p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Learn from the team that builds it.
            </h2>
            <p className="text-base text-muted-foreground md:text-lg">
              Live cohorts, self-paced courses, and free hackathons. You finish
              with a strategy that runs.
            </p>
          </div>
          <Link
            href={urls.botcamp}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            All of Botcamp <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Link href={urls.cohorts} className={`${card} flex flex-wrap items-center gap-8 p-8`}>
            <span className="font-monoton text-8xl leading-none text-primary" aria-hidden="true">
              {nextCohort.number}
            </span>
            <span className="flex min-w-56 flex-1 flex-col gap-2.5">
              <span className={`${kicker} text-muted-foreground`}>Next cohort · {nextCohort.dates}</span>
              <span className="text-2xl font-bold tracking-tight text-foreground">{nextCohort.title}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{nextCohort.body}</span>
              <span className="text-sm">
                <span className="font-bold text-foreground">{nextCohort.price}</span>
                <span className="text-muted-foreground"> · Alumni discount applies at checkout</span>
              </span>
            </span>
          </Link>

          <Link href={urls.hackathons} className={`${card} flex flex-col gap-3 p-8`}>
            <span className="flex items-center justify-between gap-3">
              <span className={`${kicker} text-muted-foreground`}>Hackathon · Free entry</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {hackathon.stage}
              </span>
            </span>
            <span className="text-2xl font-bold tracking-tight text-foreground">{hackathon.title}</span>
            <span className="text-sm leading-relaxed text-muted-foreground">{hackathon.body}</span>
            <span className="mt-1 grid grid-cols-3 gap-3 border-t border-border pt-4">
              {hackathon.stats.map((s) => (
                <span key={s.label} className="flex flex-col gap-0.5">
                  <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </span>
              ))}
            </span>
          </Link>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {courses.map((c, i) => (
            <Link key={i} href={urls.courses} className={`${card} flex flex-col gap-2 p-6`}>
              <span className={`${kicker} text-muted-foreground`}>Course · {c.level}</span>
              <span className="font-semibold text-foreground">{c.title}</span>
              <span className="text-sm text-muted-foreground">{c.meta}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
