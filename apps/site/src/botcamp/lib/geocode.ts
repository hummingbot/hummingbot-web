/**
 * Server-side forward geocoding via OpenStreetMap Nominatim (keyless).
 * Turns a free-text location ("Lisbon, Portugal") into coordinates so
 * builders can be plotted on the map. Returns null when nothing matches
 * or the lookup fails — geocoding never blocks saving the text label.
 *
 * Nominatim usage policy: identify with a User-Agent and stay under ~1
 * request/second. Callers that batch (backfills) must throttle.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
const USER_AGENT = "botcamp-site/1.0 (https://botcamp.xyz)"

export interface GeoPoint {
  latitude: number
  longitude: number
}

export async function geocodeLocation(query: string): Promise<GeoPoint | null> {
  const q = query.trim()
  if (!q) return null

  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1`
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    })
    if (!res.ok) return null

    const results = (await res.json()) as Array<{ lat: string; lon: string }>
    const hit = results[0]
    if (!hit) return null

    const latitude = Number(hit.lat)
    const longitude = Number(hit.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

    return { latitude, longitude }
  } catch {
    return null
  }
}
