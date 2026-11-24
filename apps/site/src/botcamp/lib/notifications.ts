import { prisma } from "@/botcamp/lib/prisma"
import { SUGGESTIBLE_FIELDS, SUGGESTIBLE_FIELD_LABELS, readPageSuggestions } from "@/botcamp/lib/agent-page-suggestions"
import { JOINABLE_HACKATHON_STATUSES } from "@/botcamp/lib/hackathon-stages"
import { sendEmail, emailTemplates, getResendEmailId } from "@/botcamp/lib/resend"
import type {
  AgentVersionStatus,
  NotificationType,
  StrategyStatus,
  ApplicationStatus,
} from "@prisma/client"

const getAppUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// Staff notifications (a new strategy, a hackathon application, an agent
// waiting for its final check) go once to this shared inbox — a Google Group
// staff subscribe to — never to each ADMIN account: one event is one email.
export const STAFF_NOTIFICATIONS_EMAIL = "tools@hummingbot.org"

async function sendStaffEmail(
  template: { subject: string; html: string; text: string },
  idempotencyKey: string,
  type: NotificationType,
) {
  const result = await sendEmail({
    to: STAFF_NOTIFICATIONS_EMAIL,
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey,
  })
  await prisma.notification.create({
    data: {
      recipientId: null,
      type,
      subject: template.subject,
      body: template.html,
      status: result.success ? "SENT" : "FAILED",
      sentAt: result.success ? new Date() : null,
      error: result.success ? null : String(result.error),
    },
  })
}

/**
 * Returns the user's stable unsubscribe token, generating + persisting one on
 * first use. Used to build one-click unsubscribe links for marketing email.
 */
export async function ensureUnsubscribeToken(
  userId: string,
  existing?: string | null
): Promise<string> {
  if (existing) return existing
  const token = crypto.randomUUID()
  await prisma.user.update({
    where: { id: userId },
    data: { unsubscribeToken: token },
  })
  return token
}

export type UnsubscribeCategory = "marketing" | "course"

export function buildUnsubscribeUrl(
  token: string,
  category: UnsubscribeCategory = "marketing"
): string {
  return `${getAppUrl()}/api/unsubscribe?token=${token}&category=${category}`
}

/**
 * Recipients to exclude from broadcast sends: anyone with a hard bounce
 * (email.bounced — Resend's model treats this as a permanent failure) or a
 * spam complaint on any past notification, or a soft bounce
 * (email.delivery_delayed) recorded on 2+ separate notifications — a soft
 * bounce that recurs across campaigns behaves like a dead address even
 * though Resend itself keeps retrying each individual send.
 */
export async function getSuppressedRecipientIds(
  recipientIds: string[]
): Promise<Set<string>> {
  if (recipientIds.length === 0) return new Set()

  const [hardBouncedOrComplained, repeatSoftBounced] = await Promise.all([
    prisma.notification.findMany({
      where: {
        recipientId: { in: recipientIds },
        OR: [{ bouncedAt: { not: null } }, { complainedAt: { not: null } }],
      },
      select: { recipientId: true },
      distinct: ["recipientId"],
    }),
    prisma.notification.groupBy({
      by: ["recipientId"],
      where: { recipientId: { in: recipientIds }, deliveryDelayedAt: { not: null } },
      _count: { _all: true },
      having: { recipientId: { _count: { gte: 2 } } },
    }),
  ])

  const suppressed = new Set<string>()
  for (const n of hardBouncedOrComplained) {
    if (n.recipientId) suppressed.add(n.recipientId)
  }
  for (const g of repeatSoftBounced) {
    if (g.recipientId) suppressed.add(g.recipientId)
  }
  return suppressed
}

// The free-course CTA shared by the Day 0 and Day 3 welcome-series emails.
const INTRO_COURSE_URL = () => `${getAppUrl()}/courses/intro-to-algo-trading/learn`

// Manually maintained per hackathon cycle — the Day 7 welcome-series email
// names this figure ONLY while a hackathon is actually live (REGISTRATION or
// ACTIVE in the DB); otherwise it falls back to durable, number-free copy.
// Update this when a new hackathon's prize pool is announced, and it's fine
// to leave stale between hackathons since the DB-live check gates it either way.
const CURRENT_HACKATHON_PRIZE_POOL = "$20,000"

/**
 * Looks up whichever hackathon is currently open for registration or running,
 * for the Day 7 email's prize teaser. Returns null when none is live, which
 * the template treats as "show generic, evergreen hackathon copy instead."
 */
async function getLiveHackathonForWelcomeEmail() {
  const hackathon = await prisma.hackathon.findFirst({
    // Only a hackathon people can still join — the email invites them to apply.
    where: { status: { in: JOINABLE_HACKATHON_STATUSES } },
    orderBy: { startDate: "desc" },
    select: { title: true },
  })
  if (!hackathon) return null
  return { title: hackathon.title, prizePool: CURRENT_HACKATHON_PRIZE_POOL }
}

// One entry per welcome-series drip step (Day 0 is sent at signup via
// sendWelcomeEmail, not this list — see the cron route for how this drives
// the daily lookup query).
export const WELCOME_DRIP_STEPS: { day: number; notificationType: NotificationType }[] = [
  { day: 3, notificationType: "WELCOME_DAY3" },
  { day: 7, notificationType: "WELCOME_DAY7" },
  { day: 14, notificationType: "WELCOME_DAY14" },
  { day: 21, notificationType: "WELCOME_DAY21" },
  { day: 28, notificationType: "WELCOME_DAY28" },
]

/**
 * Sends the Day N welcome-series drip email for a user and records a
 * Notification. Called by the daily /api/cron/welcome-series job — one
 * user/day pairing at a time, so no batching needed at this volume.
 *
 * Idempotent per (user, day): skips if a Notification for that step already
 * exists, and skips entirely if the user opted out of marketing email.
 * Failures are non-fatal, matching the rest of this file.
 */
export async function sendWelcomeDripEmail(userId: string, day: number) {
  const step = WELCOME_DRIP_STEPS.find((s) => s.day === day)
  if (!step) throw new Error(`sendWelcomeDripEmail: no drip step for day ${day}`)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      firstName: true,
      name: true,
      emailMarketing: true,
      unsubscribeToken: true,
    },
  })

  if (!user?.email || !user.emailMarketing) return

  const alreadySent = await prisma.notification.findFirst({
    where: { recipientId: userId, type: step.notificationType },
    select: { id: true },
  })
  if (alreadySent) return

  const userName = user.firstName || user.name || "there"
  const token = await ensureUnsubscribeToken(userId, user.unsubscribeToken)
  const unsubscribeUrl = buildUnsubscribeUrl(token, "marketing")

  const template =
    day === 3
      ? emailTemplates.welcomeDay3({ userName, courseUrl: INTRO_COURSE_URL(), unsubscribeUrl })
      : day === 7
        ? emailTemplates.welcomeDay7({
            userName,
            unsubscribeUrl,
            hackathon: await getLiveHackathonForWelcomeEmail() ?? undefined,
          })
        : day === 14
          ? emailTemplates.welcomeDay14({ userName, unsubscribeUrl })
          : day === 21
            ? emailTemplates.welcomeDay21({ userName, unsubscribeUrl })
            : emailTemplates.welcomeDay28({ userName, unsubscribeUrl })

  const result = await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: `${template.text}\n\n—\nUnsubscribe: ${unsubscribeUrl}`,
    idempotencyKey: `welcome-day${day}-${userId}`,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })

  await prisma.notification.create({
    data: {
      recipientId: userId,
      type: step.notificationType,
      subject: template.subject,
      body: template.html,
      status: result.success ? "SENT" : "FAILED",
      sentAt: result.success ? new Date() : null,
      error: result.success ? null : String(result.error),
      resendEmailId: getResendEmailId(result),
    },
  })

  console.log(
    `Welcome Day ${day} email ${result.success ? "sent" : "FAILED"} to user ${userId}`
  )

  return result
}

/**
 * Sends a purchase/enrollment confirmation email and records a Notification.
 *
 * Designed to be called from BOTH the Stripe webhook and the checkout success
 * redirect — whichever path actually fulfills the purchase. Callers must only
 * invoke this when they created the enrollment(s), so the email is sent once.
 * The `idempotencyKey` (keyed on the payment intent) is a second line of
 * defense: if both paths race, Resend dedupes identical keys.
 *
 * Email failures are logged (and recorded as a FAILED notification) but never
 * thrown — a transient email problem must not break a paid enrollment.
 */
export async function sendPurchaseConfirmation(params: {
  userId: string
  courseName: string
  courseUrl: string
  amountCents: number
  idempotencyKey: string
  notificationType: NotificationType
  note?: string
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, firstName: true, name: true },
  })

  if (!user?.email) {
    console.warn(
      `sendPurchaseConfirmation: no email for user ${params.userId}; skipping`
    )
    return
  }

  const template = emailTemplates.purchaseConfirmation({
    userName: user.firstName || user.name || "there",
    courseName: params.courseName,
    courseUrl: params.courseUrl,
    amount: `$${(params.amountCents / 100).toFixed(2)}`,
    note: params.note,
  })

  const result = await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: params.idempotencyKey,
  })

  await prisma.notification.create({
    data: {
      recipientId: params.userId,
      type: params.notificationType,
      subject: template.subject,
      body: template.html,
      status: result.success ? "SENT" : "FAILED",
      sentAt: result.success ? new Date() : null,
      error: result.success ? null : String(result.error),
      resendEmailId: getResendEmailId(result),
    },
  })

  console.log(
    `Purchase confirmation ${result.success ? "sent" : "FAILED"} to user ${params.userId} (${params.idempotencyKey})`
  )

  return result
}

/**
 * Sends the Botcamp welcome email and records a Notification. Call this once,
 * right after a brand-new user record is created during registration.
 *
 * Idempotent per user via the `welcome-<userId>` Resend key, and failures are
 * non-fatal so registration always completes.
 */
export async function sendWelcomeEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, name: true },
  })

  if (!user?.email) {
    console.warn(`sendWelcomeEmail: no email for user ${userId}; skipping`)
    return
  }

  const template = emailTemplates.welcomeEmail({
    userName: user.firstName || user.name || "there",
    courseUrl: INTRO_COURSE_URL(),
  })

  const result = await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `welcome-${userId}`,
  })

  await prisma.notification.create({
    data: {
      recipientId: userId,
      type: "WELCOME",
      subject: template.subject,
      body: template.html,
      status: result.success ? "SENT" : "FAILED",
      sentAt: result.success ? new Date() : null,
      error: result.success ? null : String(result.error),
      resendEmailId: getResendEmailId(result),
    },
  })

  console.log(
    `Welcome email ${result.success ? "sent" : "FAILED"} to user ${userId}`
  )

  return result
}

// Human-readable copy for each strategy status. DRAFT is intentionally absent —
// reverting to draft does not notify.
const STRATEGY_STATUS_COPY: Partial<
  Record<StrategyStatus, { label: string; message: string }>
> = {
  SUBMITTED: {
    label: "Submitted for review",
    message:
      "Your strategy has been submitted and is now awaiting review by the Botcamp team. We'll let you know once it's been reviewed.",
  },
  CHANGES_REQUESTED: {
    label: "Changes requested",
    message:
      "The reviewers have requested changes to your strategy. Open it to read their feedback, make the updates, and resubmit when you're ready.",
  },
  APPROVED: {
    label: "Approved",
    message:
      "Great news — your strategy has been approved! You can now certify it from your dashboard.",
  },
  CERTIFIED: {
    label: "Certified",
    message:
      "Congratulations! Your strategy is now certified and featured on Botcamp.",
  },
}

/**
 * Emails every author of a strategy when its status changes. Respects each
 * author's `emailStrategyUpdates` preference. No-op for statuses without copy
 * (e.g. DRAFT). Failures are non-fatal.
 */
export async function sendStrategyStatusEmail(
  strategyId: number,
  newStatus: StrategyStatus
) {
  const copy = STRATEGY_STATUS_COPY[newStatus]
  if (!copy) return

  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    select: {
      title: true,
      authors: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              name: true,
              emailStrategyUpdates: true,
            },
          },
        },
      },
    },
  })
  if (!strategy) return

  const strategyUrl = `${getAppUrl()}/dashboard/strategies/${strategyId}`

  for (const { user } of strategy.authors) {
    if (!user.email || !user.emailStrategyUpdates) continue

    const template = emailTemplates.strategyStatusUpdate({
      userName: user.firstName || user.name || "there",
      strategyTitle: strategy.title,
      strategyUrl,
      statusLabel: copy.label,
      message: copy.message,
    })

    const result = await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: `strategy-status-${strategyId}-${newStatus}-${user.id}`,
    })

    await prisma.notification.create({
      data: {
        recipientId: user.id,
        type: "STRATEGY_UPDATE",
        subject: template.subject,
        body: template.html,
        status: result.success ? "SENT" : "FAILED",
        sentAt: result.success ? new Date() : null,
        error: result.success ? null : String(result.error),
      },
    })
  }
}

/**
 * Emails the creator(s) and all Botcamp admins right after a new strategy is
 * created. Respects each creator's `emailStrategyUpdates` preference; admins
 * always receive it. Non-fatal on failure.
 */
export async function sendStrategyCreatedEmail(strategyId: number) {
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    select: {
      title: true,
      authors: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              name: true,
              emailStrategyUpdates: true,
            },
          },
        },
      },
    },
  })
  if (!strategy) return

  const strategyUrl = `${getAppUrl()}/dashboard/strategies/${strategyId}`
  const authorNames =
    strategy.authors.map(({ user }) => user.firstName || user.name).filter(Boolean).join(", ") ||
    "A builder"

  await Promise.all(
    strategy.authors.map(async ({ user }) => {
      if (!user.email || !user.emailStrategyUpdates) return

      const template = emailTemplates.strategyCreated({
        userName: user.firstName || user.name || "there",
        strategyTitle: strategy.title,
        strategyUrl,
      })

      const result = await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: `strategy-created-${strategyId}-${user.id}`,
      })

      await prisma.notification.create({
        data: {
          recipientId: user.id,
          type: "STRATEGY_UPDATE",
          subject: template.subject,
          body: template.html,
          status: result.success ? "SENT" : "FAILED",
          sentAt: result.success ? new Date() : null,
          error: result.success ? null : String(result.error),
        },
      })
    })
  )

  await sendStaffEmail(
    emailTemplates.strategyCreatedAdmin({
      adminName: "team",
      authorNames,
      strategyTitle: strategy.title,
      adminUrl: `${getAppUrl()}/admin/strategies/${strategyId}`,
    }),
    `strategy-created-staff-${strategyId}`,
    "STRATEGY_UPDATE",
  )
}

// Human-readable copy for each application status. DRAFT is intentionally absent.
const APPLICATION_STATUS_COPY: Partial<
  Record<ApplicationStatus, { label: string; message: string }>
> = {
  FINALIZED: {
    label: "Finalized",
    message:
      "Your hackathon application has been finalized and submitted for team review. Good luck!",
  },
  REVIEWED: {
    label: "Reviewed",
    message:
      "A team has reviewed your hackathon application. Open your dashboard to see where things stand.",
  },
}

/**
 * Emails a hackathon applicant when their application status changes. Respects
 * the applicant's `emailHackathonUpdates` preference. Non-fatal on failure.
 */
export async function sendApplicationStatusEmail(
  applicationId: string,
  newStatus: ApplicationStatus
) {
  const copy = APPLICATION_STATUS_COPY[newStatus]
  if (!copy) return

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      hackathon: { select: { title: true, slug: true } },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          name: true,
          emailHackathonUpdates: true,
        },
      },
    },
  })
  if (!application?.user.email || !application.user.emailHackathonUpdates) return

  const hackathonName = application.hackathon.title || "the hackathon"
  const template = emailTemplates.applicationStatusUpdate({
    userName: application.user.firstName || application.user.name || "there",
    hackathonName,
    applicationUrl: `${getAppUrl()}/dashboard/hackathons/${application.hackathon.slug}`,
    statusLabel: copy.label,
    message: copy.message,
  })

  const result = await sendEmail({
    to: application.user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `application-status-${applicationId}-${newStatus}`,
  })

  await prisma.notification.create({
    data: {
      recipientId: application.user.id,
      type: "HACKATHON_UPDATE",
      subject: template.subject,
      body: template.html,
      status: result.success ? "SENT" : "FAILED",
      sentAt: result.success ? new Date() : null,
      error: result.success ? null : String(result.error),
    },
  })

  return result
}

/**
 * Emails every team a builder ranked, plus all Botcamp admins, when a
 * hackathon application is finalized (not on draft saves). Respects each
 * team member's `emailHackathonUpdates` preference; admins always receive
 * it. Non-fatal on failure.
 */
export async function sendApplicationSubmittedEmail(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      teamPreferences: true,
      hackathon: { select: { id: true, title: true } },
      strategy: { select: { title: true } },
      user: { select: { firstName: true, name: true } },
    },
  })
  if (!application) return

  const agentTitle = application.strategy?.title || "A new agent"
  const applicantName = application.user.firstName || application.user.name || "A builder"
  const hackathonName = application.hackathon.title || "the hackathon"

  const teams = application.teamPreferences.length
    ? await prisma.team.findMany({
        where: { id: { in: application.teamPreferences } },
        select: {
          id: true,
          name: true,
          members: {
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  name: true,
                  emailHackathonUpdates: true,
                },
              },
            },
          },
        },
      })
    : []

  const applicantsUrl = `${getAppUrl()}/dashboard/team?tab=applicants`

  await Promise.all(
    teams.flatMap((team) =>
      team.members.map(async ({ user }) => {
        if (!user.email || !user.emailHackathonUpdates) return

        const template = emailTemplates.applicationSubmitted({
          userName: user.firstName || user.name || "there",
          applicantName,
          agentTitle,
          teamName: team.name,
          hackathonName,
          applicantsUrl,
        })

        const result = await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
          idempotencyKey: `application-submitted-${applicationId}-${team.id}-${user.id}`,
        })

        await prisma.notification.create({
          data: {
            recipientId: user.id,
            type: "HACKATHON_UPDATE",
            subject: template.subject,
            body: template.html,
            status: result.success ? "SENT" : "FAILED",
            sentAt: result.success ? new Date() : null,
            error: result.success ? null : String(result.error),
          },
        })
      })
    )
  )

  // teamPreferences is the builder's ranking, in order. findMany returns rows
  // in database order, so re-sort by preference before showing it as a ranking.
  const teamsById = new Map(teams.map((team) => [team.id, team]))
  const teamNames = application.teamPreferences
    .map((teamId) => teamsById.get(teamId)?.name)
    .filter((name): name is string => !!name)

  await sendStaffEmail(
    emailTemplates.applicationSubmittedAdmin({
      adminName: "team",
      applicantName,
      agentTitle,
      hackathonName,
      teamNames,
      adminUrl: `${getAppUrl()}/admin/hackathons/${application.hackathon.id}`,
    }),
    `application-submitted-staff-${applicationId}`,
    "HACKATHON_UPDATE",
  )
}

/**
 * Emails a sponsor team's members when they lose a previously-selected
 * applicant because the applicant ranked another team higher. Without this,
 * a team only discovers the loss by noticing the applicant missing from
 * their dashboard. Respects members' `emailHackathonUpdates` preference.
 * Non-fatal on failure.
 */
export async function sendTeamOutrankedEmail(
  applicationId: string,
  previousTeamId: string
) {
  const [application, team] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        hackathon: { select: { title: true, slug: true } },
        strategy: { select: { title: true } },
        selectedTeam: { select: { name: true } },
      },
    }),
    prisma.team.findUnique({
      where: { id: previousTeamId },
      select: {
        name: true,
        members: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                name: true,
                emailHackathonUpdates: true,
              },
            },
          },
        },
      },
    }),
  ])
  if (!application || !team) return

  const agentTitle = application.strategy?.title || "An applicant"
  const hackathonName = application.hackathon.title || "the hackathon"
  const newTeamName = application.selectedTeam?.name || "another team"
  const applicantsUrl = `${getAppUrl()}/dashboard/team?tab=applicants`

  for (const { user } of team.members) {
    if (!user.email || !user.emailHackathonUpdates) continue

    const template = emailTemplates.teamApplicantOutranked({
      userName: user.firstName || user.name || "there",
      teamName: team.name,
      agentTitle,
      hackathonName,
      newTeamName,
      applicantsUrl,
    })

    const result = await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: `team-outranked-${applicationId}-${previousTeamId}-${user.id}`,
    })

    await prisma.notification.create({
      data: {
        recipientId: user.id,
        type: "HACKATHON_UPDATE",
        subject: template.subject,
        body: template.html,
        status: result.success ? "SENT" : "FAILED",
        sentAt: result.success ? new Date() : null,
        error: result.success ? null : String(result.error),
      },
    })
  }
}

/**
 * Sends a course inactivity nudge (cohort enrollments are out of scope —
 * see the cron) and records both a Notification (audit log) and a
 * CourseInactivityReminder row for the given tier — that row's unique
 * constraint on (enrollmentId, tier) is what actually guarantees "at most
 * once per tier," not this function alone, so callers (see the
 * course-inactivity cron) must still check for an existing row before
 * calling this. Respects the user's `emailCourseUpdates` preference.
 * Non-fatal on failure.
 */
export async function sendCourseInactivityReminder(
  enrollmentId: string,
  tier: "WEEK" | "MONTH"
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      userId: true,
      user: {
        select: {
          email: true,
          firstName: true,
          name: true,
          emailCourseUpdates: true,
          unsubscribeToken: true,
        },
      },
      course: { select: { slug: true, title: true } },
    },
  })
  if (!enrollment?.course) return
  if (!enrollment.user.email || !enrollment.user.emailCourseUpdates) return

  const courseName = enrollment.course.title
  const courseUrl = `${getAppUrl()}/courses/${enrollment.course.slug}/learn`

  const userName = enrollment.user.firstName || enrollment.user.name || "there"
  const token = await ensureUnsubscribeToken(enrollment.userId, enrollment.user.unsubscribeToken)
  const unsubscribeUrl = buildUnsubscribeUrl(token, "course")

  const template = emailTemplates.courseInactivityReminder({
    userName,
    courseName,
    courseUrl,
    tier,
    unsubscribeUrl,
  })

  const result = await sendEmail({
    to: enrollment.user.email,
    subject: template.subject,
    html: template.html,
    text: `${template.text}\n\n—\nUnsubscribe: ${unsubscribeUrl}`,
    idempotencyKey: `course-inactivity-${tier.toLowerCase()}-${enrollmentId}`,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })

  await prisma.$transaction([
    prisma.notification.create({
      data: {
        recipientId: enrollment.userId,
        type: tier === "WEEK" ? "COURSE_INACTIVITY_WEEK" : "COURSE_INACTIVITY_MONTH",
        subject: template.subject,
        body: template.html,
        status: result.success ? "SENT" : "FAILED",
        sentAt: result.success ? new Date() : null,
        error: result.success ? null : String(result.error),
        resendEmailId: getResendEmailId(result),
      },
    }),
    prisma.courseInactivityReminder.create({
      data: { enrollmentId, tier },
    }),
  ])

  console.log(
    `Course inactivity (${tier}) email ${result.success ? "sent" : "FAILED"} for enrollment ${enrollmentId}`
  )

  return result
}

const AGENT_VERSION_STATUS_COPY: Partial<
  Record<AgentVersionStatus, { label: string; message: string }>
> = {
  NEEDS_REVIEW: {
    label: "Passed AI review",
    message:
      "Your agent passed the AI security review. A Botcamp admin gives it a final check before it can be cloned — you'll get another email once they have.",
  },
  APPROVED: {
    label: "Approved",
    message:
      "Your agent is approved. Anyone with access to it can now clone this version into Condor — the clone command is on its page.",
  },
  REJECTED: {
    label: "Not approved",
    message:
      "Your agent version wasn't approved, so it can't be cloned. Fix what's listed below and upload a new version from its page.",
  },
}

/**
 * Tells an agent's authors where one of its uploaded versions landed after
 * review — by the AI or an admin. PENDING sends nothing. Opt-out follows
 * emailStrategyUpdates, like other strategy mail.
 */
export async function sendAgentVersionStatusEmail(versionId: string) {
  const version = await prisma.agentVersion.findUnique({
    where: { id: versionId },
    select: {
      version: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
      aiReview: true,
      strategy: {
        select: {
          id: true,
          title: true,
          authors: {
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  name: true,
                  emailStrategyUpdates: true,
                },
              },
            },
          },
        },
      },
    },
  })
  if (!version) return
  const copy = AGENT_VERSION_STATUS_COPY[version.status]
  if (!copy) return

  const agentUrl = `${getAppUrl()}/dashboard/strategies/${version.strategy.id}`
  const feedback =
    version.status === "REJECTED"
      ? ((version.aiReview as { authorFeedback?: { path: string; message: string }[] } | null)?.authorFeedback ?? [])
      : []
  const fixes = feedback.map((f) => (f.path ? `${f.path}: ${f.message}` : f.message))
  // A re-run review can land on the same status again; reviewedAt keeps each
  // decision its own email.
  const decisionKey = `${versionId}-${version.status}-${version.reviewedAt?.getTime() ?? 0}`

  for (const { user } of version.strategy.authors) {
    if (!user.email || !user.emailStrategyUpdates) continue

    const template = emailTemplates.agentVersionStatusUpdate({
      userName: user.firstName || user.name || "there",
      agentTitle: version.strategy.title,
      version: version.version,
      statusLabel: copy.label,
      message: copy.message,
      reviewNote: version.reviewNote,
      fixes,
      agentUrl,
    })

    const result = await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: `agent-version-${decisionKey}-${user.id}`,
    })

    await prisma.notification.create({
      data: {
        recipientId: user.id,
        type: "STRATEGY_UPDATE",
        subject: template.subject,
        body: template.html,
        status: result.success ? "SENT" : "FAILED",
        sentAt: result.success ? new Date() : null,
        error: result.success ? null : String(result.error),
      },
    })
  }
}

/**
 * Tells an agent's authors a reviewer suggested changes to its page's text.
 * Opt-out follows emailStrategyUpdates, like other strategy mail.
 */
export async function sendAgentPageSuggestionsEmail(strategyId: number) {
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    select: {
      id: true,
      title: true,
      pageSuggestions: true,
      authors: {
        select: { user: { select: { id: true, email: true, firstName: true, name: true, emailStrategyUpdates: true } } },
      },
    },
  })
  const suggestions = readPageSuggestions(strategy?.pageSuggestions)
  if (!strategy || !suggestions) return

  const fieldLabels = SUGGESTIBLE_FIELDS.filter((f) => suggestions.fields[f] !== undefined).map(
    (f) => SUGGESTIBLE_FIELD_LABELS[f],
  )
  const agentUrl = `${getAppUrl()}/dashboard/strategies/${strategy.id}`

  for (const { user } of strategy.authors) {
    if (!user.email || !user.emailStrategyUpdates) continue

    const template = emailTemplates.agentPageSuggestions({
      userName: user.firstName || user.name || "there",
      agentTitle: strategy.title,
      fieldLabels,
      note: suggestions.note,
      agentUrl,
    })

    const result = await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      // One email per suggestion the admin sends, however often it's re-sent.
      idempotencyKey: `agent-page-suggestions-${strategy.id}-${suggestions.suggestedAt}-${user.id}`,
    })

    await prisma.notification.create({
      data: {
        recipientId: user.id,
        type: "STRATEGY_UPDATE",
        subject: template.subject,
        body: template.html,
        status: result.success ? "SENT" : "FAILED",
        sentAt: result.success ? new Date() : null,
        error: result.success ? null : String(result.error),
      },
    })
  }
}

/**
 * Tells admins an agent version passed the AI review and is waiting
 * for their final check — the one step of the agent registry that needs a
 * person, so it shouldn't wait on someone happening to open /admin/agents.
 */
export async function sendAgentAwaitingAdminEmail(versionId: string) {
  const version = await prisma.agentVersion.findUnique({
    where: { id: versionId },
    select: {
      version: true,
      status: true,
      strategy: { select: { title: true } },
      uploadedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  if (!version || version.status !== "NEEDS_REVIEW") return

  const uploader =
    [version.uploadedBy.firstName, version.uploadedBy.lastName].filter(Boolean).join(" ") ||
    version.uploadedBy.email ||
    "Someone"
  await sendStaffEmail(
    emailTemplates.agentAwaitingAdmin({
      adminName: "team",
      uploaderName: uploader,
      agentTitle: version.strategy.title,
      version: version.version,
      adminUrl: `${getAppUrl()}/admin/agents/${versionId}`,
    }),
    `agent-awaiting-staff-${versionId}`,
    "STRATEGY_UPDATE",
  )
}

// Security notice when Condor is connected, sent straight to the account
// owner (no Notification row, no unsubscribe: it's about account access). A
// failed send is logged, never thrown, so it can't block the connect.
export async function sendCondorConnectedEmail(
  userId: string,
  connection: { clientName: string; requesterIp: string | null },
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    })
    if (!user?.email) return
    const template = emailTemplates.condorConnected({
      ...connection,
      userName: user.firstName || "there",
      manageUrl: `${getAppUrl()}/dashboard/profile?tab=condor`,
    })
    await sendEmail({ to: user.email, ...template })
  } catch (error) {
    console.error("Failed to send Condor connected email:", error)
  }
}
