import { NextResponse } from 'next/server'
import { prisma } from '@/botcamp/lib/prisma'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

// Completed cohorts, from the cohort YAML files (Cohort 0 is the examples).
function countCompletedCohorts(): number {
  const cohortsDir = path.join(process.cwd(), 'cohorts')
  return fs
    .readdirSync(cohortsDir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => yaml.load(fs.readFileSync(path.join(cohortsDir, file), 'utf8')) as { cohort: { number: number; status?: string } })
    .filter(({ cohort }) => (cohort.status || 'completed') === 'completed' && cohort.number !== 0).length
}

// The home page's "Botcamp by the Numbers".
export async function GET() {
  try {
    const [completedHackathons, certifiedStrategies] = await Promise.all([
      prisma.hackathon.findMany({ where: { status: 'COMPLETED' }, select: { prizes: true } }),
      // Certified cohort strategies, and Condor Ready agents (an approved
      // version on a page that isn't private — the /strategies rule).
      prisma.strategy.count({
        where: {
          OR: [
            { status: 'CERTIFIED' },
            {
              strategyType: 'AGENT',
              visibility: { not: 'PRIVATE' },
              agentVersions: { some: { status: 'APPROVED' } },
            },
          ],
        },
      }),
    ])

    // Prize amounts are strings like "20000 USDT"; summed as in /api/hackathons/active.
    const prizesDistributed = completedHackathons.reduce((total, hackathon) => {
      const prizes = Array.isArray(hackathon.prizes) ? (hackathon.prizes as Array<{ amount?: string }>) : []
      return (
        total +
        prizes.reduce((sum, prize) => {
          const amount = parseFloat((prize.amount ?? '').replace(/[^0-9.]/g, ''))
          return sum + (isNaN(amount) ? 0 : amount)
        }, 0)
      )
    }, 0)

    return NextResponse.json({
      cohortsCompleted: countCompletedCohorts(),
      hackathonsCompleted: completedHackathons.length,
      prizesDistributed,
      certifiedStrategies,
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
