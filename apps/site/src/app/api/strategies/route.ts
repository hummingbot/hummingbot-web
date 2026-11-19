import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/botcamp/lib/prisma'
import { requireAdmin, unauthorizedResponse } from '@/botcamp/lib/api-utils'

// Admin-only: it lists every strategy whatever its visibility, PRIVATE drafts
// included. Nothing on the site calls it; until 2026-10-29 it was public.
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const cohortNumber = searchParams.get('cohort')

    const where = {
      ...(cohortNumber ? { cohortRelation: { number: parseInt(cohortNumber) } } : {}),
    }

    const strategies = await prisma.strategy.findMany({
      where,
      include: {
        cohortRelation: {
          select: {
            number: true,
          },
        },
        files: {
          select: {
            id: true,
          },
        },
        students: {
          include: {
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
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                slug: true,
                avatarUrl: true,
              }
            }
          }
        }
      },
      orderBy: {
        cohortRelation: {
          number: 'desc'
        }
      }
    })

    // Transform the data to flatten student structure and map cohort
    const transformedStrategies = strategies.map(strategy => ({
      ...strategy,
      cohort: strategy.cohortRelation?.number ?? null,
      hasFiles: strategy.files.length > 0,
      students: strategy.students.map(ss => ss.student)
    }))

    return NextResponse.json({ data: transformedStrategies })
  } catch (error) {
    console.error('Failed to fetch strategies:', error)
    return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return unauthorizedResponse()

    const data = await request.json()
    const { studentIds, ...strategyData } = data

    const strategy = await prisma.strategy.create({
      data: {
        ...strategyData,
        students: {
          create: studentIds?.map((studentId: string) => ({
            studentId
          })) || []
        }
      },
      include: {
        students: {
          include: {
            student: true
          }
        }
      }
    })

    return NextResponse.json(strategy)
  } catch (error) {
    console.error('Failed to create strategy:', error)
    return NextResponse.json({ error: 'Failed to create strategy' }, { status: 500 })
  }
}