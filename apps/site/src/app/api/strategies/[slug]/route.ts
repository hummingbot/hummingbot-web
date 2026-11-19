import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/botcamp/lib/prisma'
import { auth } from '@/botcamp/lib/auth'
import { requireAdmin, unauthorizedResponse } from '@/botcamp/lib/api-utils'
import { raceDataBlocksDelete } from '@/botcamp/lib/race-data-guard'
import { PUBLISHED_STRATEGY_WHERE, decideStrategyCodeAccess, isAwaitingAgentApproval, isFreePreviewStrategy, isSubmittedToHackathon } from '@/botcamp/lib/strategy-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await auth()

    // Check if slug is actually a numeric ID
    const isNumericId = /^\d+$/.test(slug)
    let where: { id: number } | { slug: string } = isNumericId
      ? { id: parseInt(slug) }
      : { slug }

    // Bare-slug fallback: if the user hits `/strategies/perp-xemm` we should
    // still resolve them to `cohort-13-perp-xemm`. Look for a strategy whose
    // slug ends with `-{slug}` and prefer the most recent cohort.
    if (!isNumericId) {
      const exact = await prisma.strategy.findUnique({
        where: { slug },
        select: { id: true },
      })
      if (!exact) {
        // A published one first: a newer cohort's draft with the same name
        // would otherwise take over the link and 404 it.
        const aliasOrder = [{ cohortId: "desc" as const }, { createdAt: "desc" as const }]
        const alias =
          (await prisma.strategy.findFirst({
            where: { slug: { endsWith: `-${slug}` }, ...PUBLISHED_STRATEGY_WHERE },
            orderBy: aliasOrder,
            select: { id: true },
          })) ??
          (await prisma.strategy.findFirst({
            where: { slug: { endsWith: `-${slug}` } },
            orderBy: aliasOrder,
            select: { id: true },
          }))
        if (alias) where = { id: alias.id }
      }
    }

    const strategy = await prisma.strategy.findUnique({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        details: true,
        tags: true,
        exchanges: true,
        videoURL: true,
        status: true,
        visibility: true,
        strategyType: true,
        agentApprovalRequired: true,
        // Latest APPROVED version: gates the page (isAwaitingAgentApproval)
        // and is what the "Import to Condor" card offers.
        agentVersions: {
          where: { status: "APPROVED" },
          select: { version: true },
          orderBy: { version: "desc" },
          take: 1,
        },
        cohortId: true,
        createdAt: true,
        updatedAt: true,
        files: {
          select: {
            id: true,
            type: true,
            filename: true,
            mimeType: true,
            size: true,
            url: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        images: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        students: {
          select: {
            student: {
              select: {
                id: true,
                slug: true,
                name: true,
                avatarURL: true
              }
            }
          }
        },
        authors: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                slug: true,
                avatarUrl: true,
                profileVisibility: true,
              }
            }
          }
        },
        cohortRelation: {
          select: {
            number: true,
          }
        }
      }
    })

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    // Check visibility permissions
    const userId = session?.user?.id
    const userRole = session?.user?.role
    const isAdmin = userRole === 'ADMIN'
    const isAuthor = Boolean(userId && strategy.authors.some(a => a.user.id === userId))


    // Fetch user's current membership status from database (not cached JWT)
    let userIsMember = false
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isMember: true },
      })
      userIsMember = user?.isMember ?? false
    }

    // Code and resources (files, link URLs, images) follow the same rule as
    // the routes that serve them — decideStrategyCodeAccess — so this page
    // never lists what those routes would refuse. PRIVATE strategies still
    // show their description; only the Code and Resources tabs lock.
    const { access, viewer } = await decideStrategyCodeAccess(
      { ...strategy, authors: strategy.authors.map(a => ({ userId: a.user.id })) },
      userId ? { id: userId, role: userRole, isMember: userIsMember } : null,
    )
    const isTeamReviewer = viewer === 'reviewer'

    // The page itself — title, write-up, video — is for published strategies
    // (PUBLISHED_STRATEGY_WHERE). A draft or one still in review is its
    // authors' and admins' (and reviewing sponsors') alone.
    // An agent awaiting approval is its authors', admins' and reviewing
    // sponsors' only, like any unpublished page — which is exactly what
    // decideStrategyCodeAccess calls not_found.
    if (!viewer && (isAwaitingAgentApproval(strategy) || access === 'not_found')) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    const hasContentAccess = access === 'ok'
    const isRacing = access === 'racing'
    // Kept for the UI's labels; access above already applied them.
    const isFreePreview = Boolean(userId) && (await isFreePreviewStrategy(strategy.id))
    const isHackathonSubmission = await isSubmittedToHackathon(strategy.id)

    // An approved agent's code is its reviewed package. Its loose files (and
    // their link URLs) predate packages and were never reviewed, so only those
    // the file routes still serve them to — authors, admins, team reviewers —
    // see them listed here.
    const looseFilesWithdrawn =
      strategy.strategyType === 'AGENT' && strategy.agentVersions.length > 0 && !viewer

    // Transform the data to flatten student structure and add computed fields
    const transformedStrategy = {
      ...strategy,
      files: hasContentAccess && !looseFilesWithdrawn ? strategy.files : [],
      images: hasContentAccess ? strategy.images : [],
      cohort: strategy.cohortRelation?.number ?? null,
      students: strategy.students.map(ss => ss.student),
      cohortRelation: undefined, // Remove internal field
      agentApprovalRequired: undefined,
      agentVersions: undefined,
      condorVersion: strategy.strategyType === 'AGENT' ? (strategy.agentVersions[0]?.version ?? null) : null,
      userIsMember, // Include fresh membership status from database
      userIsAuthor: isAuthor,
      userIsAdmin: isAdmin,
      isFreePreview,
      isHackathonSubmission,
      isTeamReviewer,
      isRacing,
      hasContentAccess,
    }

    return NextResponse.json(transformedStrategy)
  } catch (error) {
    console.error('Failed to fetch strategy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch strategy' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { slug } = await params
    const body = await request.json()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { studentIds, id, createdAt, updatedAt, ...strategyData } = body


    // Check if slug is actually a numeric ID
    const isNumericId = /^\d+$/.test(slug)
    const where = isNumericId
      ? { id: parseInt(slug) }
      : { slug }

    // First, update the strategy
    const strategy = await prisma.strategy.update({
      where,
      data: strategyData
    })

    console.log('Strategy updated:', strategy.id)

    // Handle student associations
    if (studentIds !== undefined) {

      // Remove existing associations
      await prisma.studentStrategy.deleteMany({
        where: {
          strategyId: strategy.id
        }
      })

      // Create new associations
      if (Array.isArray(studentIds) && studentIds.length > 0) {
        await prisma.studentStrategy.createMany({
          data: studentIds.map((studentId: string) => ({
            studentId,
            strategyId: strategy.id
          }))
        })
      }
    }

    // Fetch updated strategy with students
    const updatedStrategy = await prisma.strategy.findUnique({
      where: { id: strategy.id },
      include: {
        students: {
          include: {
            student: true
          }
        }
      }
    })

    console.log('Returning updated strategy:', updatedStrategy?.id)
    return NextResponse.json(updatedStrategy)
  } catch (error) {
    // The error stays in the logs: a Prisma message carries the query,
    // column names and values, which no response should.
    console.error('Failed to update strategy:', error)
    return NextResponse.json({ error: 'Failed to update strategy' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { slug } = await params

    // Check if slug is actually a numeric ID
    const isNumericId = /^\d+$/.test(slug)
    const where = isNumericId
      ? { id: parseInt(slug) }
      : { slug }

    const blocked = await raceDataBlocksDelete({ application: { strategy: where } }, 'strategy')
    if (blocked) return NextResponse.json({ error: blocked }, { status: 409 })

    await prisma.strategy.delete({
      where
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete strategy:', error)
    return NextResponse.json({ error: 'Failed to delete strategy' }, { status: 500 })
  }
}
