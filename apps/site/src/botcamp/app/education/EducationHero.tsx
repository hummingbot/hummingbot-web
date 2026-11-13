"use client"

interface EducationHeroProps {
  totalMembers: number
  certifiedStrategies: number
  totalCohorts: number
}

export function EducationHero({
  totalMembers,
  certifiedStrategies,
  totalCohorts,
}: EducationHeroProps) {
  return (
    <div className="relative bg-background pt-16 md:pt-20 pb-8">
      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        <div className="text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
            Botcamp Education
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-bc-tight leading-[1.05] mb-4 md:leading-(--text-5xl--line-height)">
            Build AI trading agents used by pro market makers
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed md:leading-(--text-lg--line-height)">
            Live cohorts and self-paced courses that teach algorithmic trading and market
            making on the Hummingbot framework — taught by the team that built it.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 mt-8 text-[13.5px] text-muted-foreground">
            <span><b className="text-foreground font-semibold">{totalMembers}</b> members</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span><b className="text-foreground font-semibold">{certifiedStrategies}</b> certified strategies</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span><b className="text-foreground font-semibold">{totalCohorts}</b> cohorts since 2022</span>
            <span className="hidden sm:block w-px h-5 bg-border" />
            <span className="font-mono text-[11.5px] text-muted-foreground">
              engineers from Binance · Ripple · Wintermute
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
