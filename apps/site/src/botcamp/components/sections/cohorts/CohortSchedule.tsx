'use client'

import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import Link from "next/link"
import { Badge } from "@/botcamp/components/ui/badge"
import { parseLessonVideo, VIDEO_IFRAME_SANDBOX } from "@/botcamp/lib/video-embed"

interface Session {
  date: string
  time: string
  type: string
  title: string
  description: string
  videoUrl?: string
  videoId?: string | null
  isFree?: boolean
  instructor?: string
  instructorEmail?: string
  eventUrl?: string
}

interface Week {
  week: number
  title: string
  description: string
  sessions: Session[]
}

interface CohortScheduleProps {
  cohortLink: string
  helioLink: string
  startDate?: Date
  cohortNumber: number
  weeks: Week[]
  landingLink?: string
}


export default function CohortSchedule({
  cohortLink,
  helioLink,
  cohortNumber,
  weeks,
  landingLink
}: CohortScheduleProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00Z')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
  }

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'setup':
        return '🚀'
      case 'theory':
        return '📖'
      case 'technical':
        return '👨‍💻'
      case 'office_hours':
        return '💬'
      case 'demo_day':
        return '🏆'
      default:
        return '📌'
    }
  }

  const getSessionBadge = (type: string) => {
    const typeMap: Record<string, string> = {
      setup: 'Setup',
      theory: 'Theory',
      technical: 'Technical',
      office_hours: 'Office Hours',
      demo_day: 'Demo Day'
    }
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/50" id="schedule">
      <div className="container px-4 md:px-6 mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-center space-y-bc-6 text-center mb-12">
          {landingLink && (
            <Link
              href={landingLink}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Back to Cohort {cohortNumber}
            </Link>
          )}
          <h2 className="text-3xl font-bold tracking-bc-tighter sm:text-5xl mb-4">Botcamp Cohort {cohortNumber} Schedule</h2>

          <div className="max-w-[800px] prose prose-zinc dark:prose-invert">
            <p className="text-muted-foreground text-lg">
              Each session runs for 1-2 hours with interactive Q&A, and participants receive <span className="font-semibold text-primary">lifetime access</span> to all session recordings, code samples, and course materials.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
              <div className="bg-card rounded-bc-lg p-6 shadow-xs border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl text-primary">📖</span>
                  <h3 className="text-lg font-semibold">Michael Feng</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Hummingbot co-founder and CEO. Mike teaches market making theory, trading strategies, and business models used by professional market makers.
                </p>
              </div>

              <div className="bg-card rounded-bc-lg p-6 shadow-xs border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl text-primary">👨‍💻</span>
                  <h3 className="text-lg font-semibold">Federico Cardoso</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Hummingbot lead developer. Fede leads hands-on technical sessions where you&apos;ll build, test, and deploy algorithmic trading strategies.
                </p>
              </div>

              <div className="bg-card rounded-bc-lg p-6 shadow-xs border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl text-primary">🏆</span>
                  <h3 className="text-lg font-semibold">Demo Day</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Present your custom trading strategy to peers and industry experts, showcasing your skills and earning certification as a Hummingbot developer.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Timeline for all weeks */}
        <div className="relative border-l-2 border-primary/30 pl-10 ml-6 mt-16 space-y-bc-16">
          {/* Dynamic Weeks from YAML */}
          {weeks.map((week) => (
            <div key={week.week} className="relative">
              <div className="absolute -left-[57px] flex items-center justify-center w-8 h-8 bg-primary rounded-full text-primary-foreground">
                <span className="text-sm font-bold">{week.week}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-6">Week {week.week}: {week.title}</h3>
                <div className="space-y-bc-6">
                  {week.sessions.map((session, idx) => {
                    const embedUrl = session.videoId ? parseLessonVideo(session.videoId)?.embedUrl ?? null : null
                    const showVideo = session.isFree && embedUrl

                    return (
                      <Card key={idx} className="overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl text-primary">{getSessionIcon(session.type)}</span>
                              <div>
                                <h4 className="font-bold text-lg">{session.title}</h4>
                                <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-primary/5">{session.instructor || getSessionBadge(session.type)}</Badge>
                          </div>

                          {/* Video player for free sessions */}
                          {showVideo && (
                            <div className="aspect-video bg-black rounded-bc-lg overflow-hidden mb-4">
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                sandbox={VIDEO_IFRAME_SANDBOX}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}

                          {session.description && (
                            <p className="text-muted-foreground whitespace-pre-wrap">
                              {session.description}
                            </p>
                          )}
                          {session.eventUrl && (
                            <div className="mt-4">
                              <Button asChild size="sm" variant="outline">
                                <Link href={session.eventUrl} target="_blank">
                                  Register Free →
                                </Link>
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="relative z-10 mt-20 max-w-xl mx-auto">
          <div className="bg-card rounded-bc-xl shadow-lg p-8 border">
            <h3 className="text-2xl font-bold mb-4 text-center">Ready to transform your trading skills?</h3>
            <p className="text-muted-foreground mb-6 text-center">
              Join Botcamp Cohort {cohortNumber} and learn professional market making.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="w-full">
                <Link href={cohortLink} target="_blank">
                  Enroll Now
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href={helioLink} target="_blank">
                  Chat in Telegram
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
