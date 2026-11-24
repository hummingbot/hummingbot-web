import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/botcamp/lib/prisma'
import { PUBLISHED_STRATEGY_WHERE } from '@/botcamp/lib/strategy-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params
    const cohortNumber = parseInt(number)

    if (isNaN(cohortNumber)) {
      return NextResponse.json(
        { error: 'Invalid cohort number' },
        { status: 400 }
      )
    }

    // Get cohort info and stats in parallel
    const [cohort, enrollmentCount, strategies] = await Promise.all([
      // 1. Get cohort basic info from database
      prisma.cohort.findUnique({
        where: { number: cohortNumber },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          description: true,
        }
      }),
      // 2. Count enrolled users
      prisma.enrollment.count({
        where: {
          cohort: {
            number: cohortNumber
          }
        }
      }),
      // 3. Get all strategies with authors for this cohort
      // Published and not PRIVATE: this is a public page.
      prisma.strategy.findMany({
        where: {
          cohortRelation: {
            number: cohortNumber
          },
          visibility: { not: 'PRIVATE' },
          ...PUBLISHED_STRATEGY_WHERE,
        },
        include: {
          authors: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  slug: true,
                  avatarUrl: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    ])

    if (!cohort) {
      return NextResponse.json(
        { error: `Cohort ${cohortNumber} not found` },
        { status: 404 }
      )
    }

    // Get unique users with strategies (certified developers)
    const uniqueAuthorIds = new Set<string>()
    for (const strategy of strategies) {
      for (const author of strategy.authors) {
        uniqueAuthorIds.add(author.userId)
      }
    }
    const certifiedDevelopers = uniqueAuthorIds.size

    // Total participants: max of enrolled users vs users with strategies
    const totalParticipants = Math.max(enrollmentCount, certifiedDevelopers)

    // Transform strategies to match expected format
    const transformedStrategies = strategies.map(strategy => ({
      id: strategy.id,
      slug: strategy.slug,
      title: strategy.title,
      tags: strategy.tags,
      exchanges: strategy.exchanges,
      summary: strategy.summary,
      videoURL: strategy.videoURL,
      students: strategy.authors.map(a => ({
        name: a.user.name || `${a.user.firstName || ""} ${a.user.lastName || ""}`.trim() || "Anonymous",
        slug: a.user.slug || a.user.id,
        avatarURL: a.user.avatarUrl
      }))
    }))

    // Return combined data
    return NextResponse.json({
      cohort: cohortNumber,
      startDate: cohort.startDate.toISOString(),
      endDate: cohort.endDate.toISOString(),
      description: cohort.description,
      stats: {
        totalParticipants,
        certifiedDevelopers,
        strategiesPresented: strategies.length
      },
      strategies: transformedStrategies
    })

  } catch (error) {
    console.error('Error fetching cohort stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
