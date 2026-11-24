import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

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

    // Load cohort YAML file
    const cohortsDir = path.join(process.cwd(), 'cohorts')
    const filePath = path.join(cohortsDir, `cohort${cohortNumber}.yaml`)

    try {
      const fileContents = fs.readFileSync(filePath, 'utf8')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as in Botcamp
      const data: any = yaml.load(fileContents)

      // Return full cohort data including weeks
      return NextResponse.json({
        number: data.cohort.number,
        status: data.cohort.status,
        startDate: data.cohort.startDate,
        endDate: data.cohort.endDate,
        weeks: data.cohort.weeks || []
      })
    } catch {
      return NextResponse.json(
        { error: `Cohort ${cohortNumber} not found` },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error fetching cohort schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
