interface TeamStatsBarProps {
  registrantsCount: number
  applicantsCount: number
  selectedCount: number
  maxSelections: number
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-bc-lg border border-border bg-card px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
    </div>
  )
}

/** Quick-glance progress for a sponsor team, shown above the tabs. */
export function TeamStatsBar({
  registrantsCount,
  applicantsCount,
  selectedCount,
  maxSelections,
}: TeamStatsBarProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Stat label="Registrants" value={String(registrantsCount)} />
      <Stat label="Applicants" value={String(applicantsCount)} />
      <Stat label="Selected" value={`${selectedCount} / ${maxSelections}`} />
    </div>
  )
}
