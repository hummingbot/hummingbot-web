import { NextResponse } from 'next/server'
import { prisma } from '@/botcamp/lib/prisma'
import { requireAdmin } from '@/botcamp/lib/api-utils'
import { getResend, broadcastEmailTemplate, parseBroadcastVariables } from '@/botcamp/lib/resend'
import { buildUnsubscribeUrl, getSuppressedRecipientIds, type UnsubscribeCategory } from '@/botcamp/lib/notifications'

// Large audiences (e.g. all_users) send in sequential batches of 100 and can
// take longer than the platform's default function timeout to complete.
export const maxDuration = 300

// Chunk array into smaller batches
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resend = getResend()
  if (!resend) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { audienceType, cohortId, hackathonSlug, userEmail, subject, body: emailBody, signature } = body

    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
    }

    // Splits a group audience into "engaged" (opened something recently) vs.
    // "long_tail" (hasn't), so a big send can go out in two waves instead of
    // one wall of mail — the long tail is where most bounces come from.
    const engagementFilter: 'all' | 'engaged' | 'long_tail' =
      body.engagementFilter === 'engaged' || body.engagementFilter === 'long_tail'
        ? body.engagementFilter
        : 'all'

    // Which opt-out category this broadcast belongs to. Drives both recipient
    // filtering and the unsubscribe link. Defaults to general marketing.
    const category: UnsubscribeCategory = body.category === 'course' ? 'course' : 'marketing'
    const prefField = category === 'course' ? 'emailCourseUpdates' : 'emailMarketing'

    // Combine body and signature
    const fullEmailBody = signature ? `${emailBody}\n\n${signature}` : emailBody

    // Get recipients based on audience type
    let recipients: { id: string; email: string; firstName: string | null; lastName: string | null }[] = []
    let suppressedCount = 0

    switch (audienceType) {
      case 'myself':
        // Send to the current admin user for testing
        const adminUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
        if (adminUser) {
          recipients = [adminUser]
        }
        break

      case 'all_users':
        recipients = await prisma.user.findMany({
          select: { id: true, email: true, firstName: true, lastName: true },
        })
        break

      case 'all_members':
        recipients = await prisma.user.findMany({
          where: { isMember: true },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
        break

      case 'course_students':
        // Users with course enrollments but no cohort enrollments
        const courseEnrollments = await prisma.enrollment.findMany({
          where: {
            courseId: { not: null },
            user: {
              enrollments: {
                none: {
                  cohortId: { not: null },
                },
              },
            },
          },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
          distinct: ['userId'],
        })
        recipients = courseEnrollments.map(e => e.user)
        break

      case 'admin_users':
        recipients = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
        break

      case 'cohort':
        if (!cohortId) {
          return NextResponse.json({ error: 'Cohort ID required' }, { status: 400 })
        }
        const enrollments = await prisma.enrollment.findMany({
          where: { cohortId },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        })
        recipients = enrollments.map(e => e.user)
        break

      case 'hackathon':
        if (!hackathonSlug) {
          return NextResponse.json({ error: 'Hackathon slug required' }, { status: 400 })
        }
        const hackathon = await prisma.hackathon.findUnique({
          where: { slug: hackathonSlug },
          select: { id: true },
        })
        if (!hackathon) {
          return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 })
        }
        const entries = await prisma.hackathonEntry.findMany({
          where: { hackathonId: hackathon.id },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        })
        recipients = entries.map(e => e.user)
        break

      case 'specific_user':
        if (!userEmail) {
          return NextResponse.json({ error: 'User email required' }, { status: 400 })
        }
        const specificUser = await prisma.user.findUnique({
          where: { email: userEmail },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
        if (!specificUser) {
          return NextResponse.json({ error: 'User not found with that email' }, { status: 404 })
        }
        recipients = [specificUser]
        break

      default:
        return NextResponse.json({ error: 'Invalid audience type' }, { status: 400 })
    }

    // Any broadcast to a group larger than just admins should also reach every
    // admin, so admins always see what's going out to the community. The
    // single-recipient sends (myself, specific_user) and the admin-only
    // audience are left untouched. Admins are still subject to the opt-out
    // filtering below, same as everyone else.
    const GROUP_AUDIENCES = ['all_users', 'all_members', 'course_students', 'cohort', 'hackathon']
    if (GROUP_AUDIENCES.includes(audienceType)) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
      const existingIds = new Set(recipients.map(r => r.id))
      for (const admin of admins) {
        if (!existingIds.has(admin.id)) {
          recipients.push(admin)
          existingIds.add(admin.id)
        }
      }
    }

    // Respect opt-outs for this category and ensure every recipient has an
    // unsubscribe token. Skipped for the admin "myself" test send.
    const unsubscribeTokens = new Map<string, string>()
    if (audienceType !== 'myself') {
      const prefs = await prisma.user.findMany({
        where: { id: { in: recipients.map(r => r.id) } },
        select: { id: true, emailMarketing: true, emailCourseUpdates: true, unsubscribeToken: true },
      })
      const prefMap = new Map(prefs.map(p => [p.id, p]))

      // Drop anyone who has opted out of this category.
      recipients = recipients.filter(r => prefMap.get(r.id)?.[prefField] !== false)

      // Drop anyone with a hard bounce, spam complaint, or repeat soft bounce
      // on file — sending to them again is what drives the daily bounce-rate
      // spikes mailbox providers judge a domain's reputation on.
      const suppressedIds = await getSuppressedRecipientIds(recipients.map(r => r.id))
      suppressedCount = suppressedIds.size
      recipients = recipients.filter(r => !suppressedIds.has(r.id))

      // Split into engaged vs. long-tail if requested, based on whether they
      // opened any past notification in the last 90 days.
      if (engagementFilter !== 'all') {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        const engagedRows = await prisma.notification.findMany({
          where: { recipientId: { in: recipients.map(r => r.id) }, openedAt: { gte: ninetyDaysAgo } },
          select: { recipientId: true },
          distinct: ['recipientId'],
        })
        const engagedIds = new Set(engagedRows.map(r => r.recipientId))
        recipients = engagementFilter === 'engaged'
          ? recipients.filter(r => engagedIds.has(r.id))
          : recipients.filter(r => !engagedIds.has(r.id))
      }

      // Generate + persist tokens for recipients that don't have one yet.
      await Promise.all(
        recipients.map(async r => {
          const existing = prefMap.get(r.id)?.unsubscribeToken
          if (existing) {
            unsubscribeTokens.set(r.id, existing)
            return
          }
          const token = crypto.randomUUID()
          await prisma.user.update({ where: { id: r.id }, data: { unsubscribeToken: token } })
          unsubscribeTokens.set(r.id, token)
        })
      )
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
    }

    // Get cohort number if cohort broadcast
    let cohortNumber: number | null = null
    if (audienceType === 'cohort' && cohortId) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
        select: { number: true }
      })
      cohortNumber = cohort?.number ?? null
    }

    // Create broadcast record
    const broadcast = await prisma.broadcast.create({
      data: {
        subject,
        body: emailBody,
        audienceType,
        cohortNumber,
        hackathonSlug: audienceType === 'hackathon' ? hackathonSlug : null,
        recipientCount: recipients.length,
        sentById: session.user.id,
      }
    })
    const broadcastId = broadcast.id

    // Prepare email content
    const fromAddress = process.env.EMAIL_FROM || "Hummingbot Botcamp <operations@send.botcamp.xyz>"
    const replyToAddress = process.env.EMAIL_REPLY_TO || "operations@botcamp.xyz"

    // Chunk recipients into batches of 100 (Resend limit)
    const batches = chunkArray(recipients, 100)
    let totalSent = 0

    // Send emails in batches
    for (const batch of batches) {
      const emails = batch.map(recipient => {
        // Parse variables in both subject and body (including signature)
        const personalizedBody = parseBroadcastVariables(fullEmailBody, recipient)
        const personalizedMarkdown = parseBroadcastVariables(fullEmailBody, recipient, { markdown: true })
        const personalizedSubject = parseBroadcastVariables(subject, recipient)

        const token = unsubscribeTokens.get(recipient.id)
        const unsubscribeUrl = token ? buildUnsubscribeUrl(token, category) : undefined

        // Generate HTML from markdown
        const html = broadcastEmailTemplate({
          content: personalizedMarkdown,
          preHeaderText: personalizedSubject,
          unsubscribeUrl,
        })

        return {
          from: fromAddress,
          to: [recipient.email],
          replyTo: replyToAddress,
          subject: personalizedSubject,
          html,
          text: unsubscribeUrl
            ? `${personalizedBody}\n\n—\nUnsubscribe: ${unsubscribeUrl}`
            : personalizedBody,
          ...(unsubscribeUrl
            ? {
                headers: {
                  'List-Unsubscribe': `<${unsubscribeUrl}>`,
                  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
              }
            : {}),
        }
      })

      try {
        const { data, error } = await resend.batch.send(emails)

        if (error) {
          console.error('Resend batch error:', error)
          // Continue with next batch even if one fails
          continue
        }

        totalSent += emails.length

        // Create notification records for this batch, tagging each with the
        // Resend-assigned email id (same index order as the request) so the
        // webhook can match delivered/opened/clicked/bounced events back to it.
        await prisma.notification.createMany({
          data: batch.map((recipient, i) => ({
            type: 'BROADCAST',
            recipientId: recipient.id,
            subject: subject,
            body: emailBody,
            status: 'SENT',
            sentAt: new Date(),
            broadcastId: broadcastId,
            resendEmailId: data?.data?.[i]?.id ?? null,
          })),
        })
      } catch (batchError) {
        console.error('Error sending batch:', batchError)
        // Continue with next batch
      }
    }

    return NextResponse.json({
      success: true,
      broadcastId,
      recipientCount: recipients.length,
      sentCount: totalSent,
      suppressedCount,
    })
  } catch (error) {
    // Logged, not returned: a database or provider error message isn't
    // something to hand back.
    console.error('Broadcast error:', error)
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 })
  }
}
