import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The ported code uses Botcamp-only class names where its Tailwind v3 scale
// differs from this site's (rounded-bc-*, tracking-bc-*, space-x/y-bc-*; see
// botcamp.css) and v4 names for v3's shadow-sm/blur-sm (-xs). tailwind-merge
// has to know them so overrides like `rounded-full` or `space-y-bc-0` win.
const isSpacing = (value: string) => /^[0-9.]+$/.test(value)

const twMerge = extendTailwindMerge<"space-y-bc" | "space-x-bc">({
  extend: {
    theme: { borderRadius: ["bc-sm", "bc-md", "bc-lg", "bc-xl"] },
    classGroups: {
      shadow: [{ shadow: ["xs"] }],
      tracking: [{ tracking: ["bc-tight", "bc-tighter"] }],
      blur: [{ blur: ["xs"] }],
      "backdrop-blur": [{ "backdrop-blur": ["xs"] }],
      "space-y-bc": [{ "space-y-bc": [isSpacing] }],
      "space-x-bc": [{ "space-x-bc": [isSpacing] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if a user role has elevated privileges (ADMIN or INSTRUCTOR)
 * These users are always treated as members and certified
 */
export function isPrivilegedRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "INSTRUCTOR"
}

/**
 * Compute effective membership status based on role and actual membership
 * ADMIN and INSTRUCTOR users are always treated as members
 */
export function getEffectiveMembership(user: {
  role?: string | null
  isMember?: boolean | null
  certified?: boolean | null
}): { isMember: boolean; isCertified: boolean } {
  const privileged = isPrivilegedRole(user.role)
  return {
    isMember: privileged || (user.isMember ?? false),
    isCertified: privileged || (user.certified ?? false),
  }
}

/**
 * Get cohort badge classes based on whether the cohort number is odd or even
 * Cohort 0 (Other Members) uses the same styling as even cohorts
 * Even cohorts get a lighter variant, odd cohorts get a darker variant
 */
export function getCohortBadgeClasses(cohortNumber: number): string {
  // Cohort 0 (Other Members) uses even cohort styling
  if (cohortNumber === 0) {
    return "bg-accent/20 text-accent border border-accent/30"
  }

  const isEven = cohortNumber % 2 === 0

  if (isEven) {
    // Lighter accent variant for even cohorts
    return "bg-accent/20 text-accent border border-accent/30"
  } else {
    // Darker accent variant for odd cohorts
    return "bg-accent/40 text-accent-foreground dark:text-accent border border-accent/50"
  }
}

/**
 * Capitalize exchange names for display
 */
export function capitalizeExchange(exchange: string): string {
  return exchange.charAt(0).toUpperCase() + exchange.slice(1)
}
