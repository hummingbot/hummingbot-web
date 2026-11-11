/**
 * Browser-geolocation helper. Asks the browser for the user's coordinates,
 * then reverse-geocodes them to a human-readable "City, Country" label via
 * BigDataCloud's keyless client-side endpoint.
 *
 * Throws clear errors (unsupported / denied / lookup failed) so callers can
 * surface them — no silent fallbacks.
 */

const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client"

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 600_000,
    })
  })
}

/** Returns a "City, Country" label for the user's current browser location. */
export async function detectBrowserLocation(): Promise<string> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation isn't supported by this browser")
  }

  let position: GeolocationPosition
  try {
    position = await getPosition()
  } catch (err) {
    if (err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED) {
      throw new Error("Location permission denied — enter it manually")
    }
    throw new Error("Couldn't get your location — enter it manually")
  }

  const { latitude, longitude } = position.coords
  const res = await fetch(
    `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
  )
  if (!res.ok) {
    throw new Error("Couldn't look up your location — enter it manually")
  }

  const data = (await res.json()) as {
    city?: string
    locality?: string
    principalSubdivision?: string
    countryName?: string
  }
  const city = data.city || data.locality || data.principalSubdivision || ""
  const country = data.countryName || ""
  const label = [city, country].filter(Boolean).join(", ")

  if (!label) {
    throw new Error("Couldn't determine your location — enter it manually")
  }
  return label
}
