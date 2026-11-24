"use client"

import { VideoLesson } from "@/botcamp/components/lessons/VideoLesson"
import { ArticleLesson } from "@/botcamp/components/lessons/ArticleLesson"
import { QuizLesson } from "@/botcamp/components/lessons/QuizLesson"
import { ChallengeLesson } from "@/botcamp/components/lessons/ChallengeLesson"
import { Calendar, Clock, Presentation } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"

interface QuizData {
  questions?: Array<{
    question: string
    options: string[]
    correctIndex: number
    explanation?: string
  }>
}

interface ChallengeData {
  steps?: Array<{
    title: string
    description: string
    hint?: string
  }>
  starterCode?: string
  solutionCode?: string
  externalUrl?: string
}

// Session info for cohort lessons
interface SessionInfo {
  sessionDate?: string
  sessionTime?: string
  description?: string
  slidesURL?: string
}

interface LessonContentProps {
  type: string
  content: string | null
  videoId: string | null
  quizData: unknown
  transcript?: string | null
  sessionInfo?: SessionInfo | null
  /** Identifies the lesson to the progress API (VIDEO, QUIZ, and
   *  CHALLENGE lessons). Omitted in admin preview contexts, where
   *  there's nothing to track. */
  lessonId?: string
  initialPositionSeconds?: number
  initialCompleted?: boolean
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z")
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function UpcomingSession({ sessionInfo }: { sessionInfo: SessionInfo }) {
  return (
    <div className="rounded-bc-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Calendar className="h-5 w-5" />
        <span className="font-semibold">Upcoming Live Session</span>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {sessionInfo.sessionDate && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatSessionDate(sessionInfo.sessionDate)}</span>
          </div>
        )}
        {sessionInfo.sessionTime && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{sessionInfo.sessionTime}</span>
          </div>
        )}
      </div>

      {sessionInfo.description && (
        <p className="text-muted-foreground leading-relaxed">
          {sessionInfo.description}
        </p>
      )}

      {sessionInfo.slidesURL && (
        <div className="flex">
          <Button
            variant="outline"
            onClick={() => window.open(sessionInfo.slidesURL, "_blank")}
          >
            <Presentation className="h-4 w-4 mr-2" />
            View Slides
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground italic">
        The recording will be available here after the session.
      </p>
    </div>
  )
}

export function LessonContent({
  type,
  content,
  videoId,
  quizData,
  transcript,
  sessionInfo,
  lessonId,
  initialPositionSeconds,
  initialCompleted,
}: LessonContentProps) {
  switch (type) {
    case "VIDEO":
      // If no video yet but we have session info, show upcoming session details
      if (!videoId && sessionInfo) {
        return <UpcomingSession sessionInfo={sessionInfo} />
      }
      return videoId ? (
        <VideoLesson
          videoId={videoId}
          content={content}
          transcript={transcript}
          slidesURL={sessionInfo?.slidesURL}
          lessonId={lessonId}
          initialPositionSeconds={initialPositionSeconds}
          initialCompleted={initialCompleted}
        />
      ) : (
        <div className="text-muted-foreground">Video not available.</div>
      )

    case "ARTICLE":
      return content ? (
        <ArticleLesson content={content} />
      ) : (
        <div className="text-muted-foreground">Content not available.</div>
      )

    case "QUIZ": {
      const quiz = quizData as QuizData | null
      return quiz?.questions ? (
        <QuizLesson questions={quiz.questions} />
      ) : (
        <div className="text-muted-foreground">Quiz not available.</div>
      )
    }

    case "CHALLENGE": {
      const challenge = quizData as ChallengeData | null
      return (
        <ChallengeLesson
          content={content || "Complete this coding challenge."}
          steps={challenge?.steps}
          starterCode={challenge?.starterCode}
          solutionCode={challenge?.solutionCode}
          externalUrl={challenge?.externalUrl}
          initialCompleted={initialCompleted}
        />
      )
    }

    default:
      return (
        <div className="text-muted-foreground">Unknown lesson type: {type}</div>
      )
  }
}
