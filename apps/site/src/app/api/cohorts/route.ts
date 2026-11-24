import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

export async function GET() {
  try {
    const cohortsDir = path.join(process.cwd(), 'cohorts')
    const files = fs.readdirSync(cohortsDir)

    const cohorts = files
      .filter(file => file.endsWith('.yaml'))
      .map(file => {
        const filePath = path.join(cohortsDir, file)
        const fileContents = fs.readFileSync(filePath, 'utf8')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as in Botcamp
        const data: any = yaml.load(fileContents)

        return {
          number: data.cohort.number,
          status: data.cohort.status || 'completed',
          startDate: data.cohort.startDate,
          endDate: data.cohort.endDate,
          description: data.cohort.description,
          demoDayURL: data.cohort.demoDayURL,
          registrationUrl: data.cohort.registrationUrl
        }
      })
      .sort((a, b) => b.number - a.number) // Sort descending by cohort number

    return NextResponse.json(cohorts)
  } catch (error) {
    console.error('Error fetching cohorts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cohorts' },
      { status: 500 }
    )
  }
}
