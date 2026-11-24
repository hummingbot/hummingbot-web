/**
 * Avatar utilities for generating consistent avatar styles
 */

interface GradientStyle {
  background: string
}

/**
 * Generate a deterministic gradient background based on a name
 * Uses the golden ratio to distribute colors evenly across the spectrum
 * @param name - Name to generate gradient from (uses first character)
 * @returns CSS style object with background gradient
 */
export function getAvatarGradient(name: string): GradientStyle {
  const firstChar = (name || "A").charAt(0).toUpperCase()
  const charCode = firstChar.charCodeAt(0) - 65 // A = 0, B = 1, etc.

  // Use golden ratio for even distribution across color wheel
  const goldenRatio = 0.618033988749895
  const hue1 = (charCode * goldenRatio * 360) % 360
  const hue2 = (hue1 + 30) % 360 // Slight offset for gradient

  const saturation = 70
  const lightness = 60

  return {
    background: `linear-gradient(135deg, hsl(${hue1}, ${saturation}%, ${lightness}%) 0%, hsl(${hue2}, ${saturation}%, ${lightness - 10}%) 100%)`,
  }
}

/**
 * Get initials from a full name
 * @param name - Full name (e.g., "John Doe")
 * @returns Initials (e.g., "JD"), max 2 characters
 */
export function getInitials(name: string): string {
  if (!name) return "?"

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Get display name from first and last name
 * @param firstName - First name
 * @param lastName - Last name (optional)
 * @returns Full display name
 */
export function getDisplayName(firstName: string | null, lastName?: string | null): string {
  const parts = [firstName, lastName].filter(Boolean)
  return parts.join(" ") || "Unknown"
}

/**
 * Generate avatar URL for a user (for future use with avatar uploads)
 * @param userId - User ID
 * @returns Avatar URL
 */
export function getAvatarUrl(userId: string): string {
  return `/api/users/${userId}/avatar`
}
