/** Picks readable black/white text for a solid background color, using the
 * YIQ perceived-brightness formula. Needed for sponsor accent colors, which
 * range from dark (Botcamp orange) to light (Derive lime `#B6FF3C`) — a
 * fixed white or black text color goes illegible on half of them. */
export function getContrastTextColor(hexColor: string): "#000000" | "#ffffff" {
  const hex = hexColor.replace("#", "")
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some((n) => Number.isNaN(n))) return "#ffffff"
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 150 ? "#000000" : "#ffffff"
}
