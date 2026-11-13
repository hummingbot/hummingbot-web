"use client"

import type { ShowcaseBuilder } from "./BuilderShowcaseCard"

interface MapBuilder {
  id: string
  name: string
  location: string | null
  latitude: number
  longitude: number
}

/**
 * Flat SVG world map plotting one dot per builder with coordinates.
 * Hovering a dot reveals the builder's name + location. Builders without
 * coordinates (un-geocoded) simply don't appear here.
 */
export function BuildersMap({ builders }: { builders: ShowcaseBuilder[] }) {
  const points: MapBuilder[] = builders
    .filter(
      (b): b is ShowcaseBuilder & { latitude: number; longitude: number } =>
        typeof b.latitude === "number" && typeof b.longitude === "number",
    )
    .map((b) => ({
      id: b.id,
      name: b.name,
      location: b.location ?? null,
      latitude: b.latitude,
      longitude: b.longitude,
    }))

  if (points.length === 0) return null

  // Botcamp draws these on a world map with react-simple-maps, which doesn't
  // support React 19 (this site's React). Until it does, the same card shows
  // the builders' locations as a list.
  return (
    <div className="relative overflow-hidden rounded-bc-xl border border-border bg-gradient-to-br from-muted/30 via-card to-background p-5">
      <ul className="flex flex-wrap gap-2">
        {points.map((p) => (
          <li
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs"
            title={p.location ?? undefined}
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-medium">{p.name}</span>
            {p.location && <span className="text-muted-foreground">{p.location}</span>}
          </li>
        ))}
      </ul>
      <div className="mt-3 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {points.length} on the map
      </div>
    </div>
  )
}
