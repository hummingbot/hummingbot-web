/**
 * Hummingbot Course Bundle — a Stripe SKU that grants lifetime access to
 * every currently-published course AND acts as a $400 deposit toward
 * Cohort 14 tuition. There's no DB-side bundle model; the bundle exists
 * only as a Stripe Checkout session whose webhook snapshots all
 * published courses into per-course Enrollment rows at purchase time.
 *
 * Future course additions are NOT retroactively granted to existing
 * bundle buyers (the snapshot happens once, in the webhook).
 */

export const BUNDLE_PRICE_CENTS = 40000

export const BUNDLE_PRODUCT_NAME = "Hummingbot Course Bundle"

export const BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER = 14

/**
 * The pending bundle deposit to surface in dashboards, or null when the user
 * has none. Once the buyer holds a real cohort Enrollment for the cohort the
 * deposit targeted (i.e. the cohort opened and they enrolled), the official
 * cohort card replaces the deposit card — showing both would be redundant.
 */
export function getPendingBundleDeposit(
  user: { bundleDepositCohortNumber: number | null; bundleDepositAt: Date | null } | null,
  enrolledCohortNumbers: number[],
): { cohortNumber: number; depositedAt: Date } | null {
  if (!user?.bundleDepositCohortNumber || !user.bundleDepositAt) return null
  if (enrolledCohortNumbers.includes(user.bundleDepositCohortNumber)) return null
  return { cohortNumber: user.bundleDepositCohortNumber, depositedAt: user.bundleDepositAt }
}
