import { prisma } from "@/botcamp/lib/prisma"

/**
 * Updates a user's isMember flag based on their cohort enrollments.
 * - Sets isMember: true if user has any cohort enrollment
 * - Sets isMember: false if user has no cohort enrollments
 */
export async function updateUserMembershipStatus(userId: string): Promise<boolean> {
  const cohortEnrollmentCount = await prisma.enrollment.count({
    where: { userId, cohortId: { not: null } },
  })

  const isMember = cohortEnrollmentCount > 0

  await prisma.user.update({
    where: { id: userId },
    data: { isMember },
  })

  return isMember
}

/**
 * Sets a user as a member (used after cohort enrollment).
 * This is a simplified version when we know the user should be a member.
 */
export async function setUserAsMember(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isMember: true },
  })
}

/**
 * Checks if a user is already enrolled in a specific course.
 */
export async function isEnrolledInCourse(userId: string, courseId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  return !!enrollment
}

/**
 * Checks if a user is already enrolled in a specific cohort.
 */
export async function isEnrolledInCohort(userId: string, cohortId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_cohortId: { userId, cohortId } },
  })
  return !!enrollment
}

/**
 * Checks if a user has applied to a specific hackathon.
 */
export async function hasAppliedToHackathon(userId: string, hackathonId: string): Promise<boolean> {
  const application = await prisma.application.findFirst({
    where: { userId, hackathonId },
  })
  return !!application
}
