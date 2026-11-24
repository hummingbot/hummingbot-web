import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { LessonContent } from "@/botcamp/components/lessons/LessonContent"
import TableOfContents, { MobileTableOfContents } from "@/botcamp/components/lessons/TableOfContents"
import { extractHeadings } from "@/botcamp/lib/markdown-utils"

interface LessonInfo {
  slug: string
  title: string
}

interface LessonBodyProps {
  title: string
  type: string
  content: string | null
  videoId?: string | null
  quizData?: unknown
  transcript?: string | null
  sessionInfo?: {
    sessionDate?: string
    sessionTime?: string
    description?: string
    slidesURL?: string
  } | null

  /** Identifies the lesson to the progress API (VIDEO, QUIZ, and CHALLENGE lessons). */
  lessonId: string
  initialPositionSeconds?: number
  initialCompleted?: boolean

  learnBasePath: string
  overviewPath: string
  nextLesson?: LessonInfo | null
}

/**
 * Lesson body — title + meta + delegated `LessonContent` render +
 * "Up next" link. `LessonContent` handles type-specific rendering
 * (video iframe, markdown article, quiz, coding challenge, cohort
 * session card). At lg+ a right-side TOC tracks markdown headings.
 */
export function LessonBody({
  title,
  type,
  content,
  videoId,
  quizData,
  transcript,
  sessionInfo,
  lessonId,
  initialPositionSeconds,
  initialCompleted,
  learnBasePath,
  overviewPath,
  nextLesson,
}: LessonBodyProps) {
  const tocItems = content ? extractHeadings(content) : []

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto flex max-w-2xl gap-x-10 py-10 sm:py-14 lg:max-w-5xl">
          <div className="w-full flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold tracking-bc-tight text-foreground leading-tight mb-6">
              {title}
            </h1>

            {tocItems.length > 0 && (
              <MobileTableOfContents items={tocItems} className="mb-6 lg:hidden" />
            )}

            <LessonContent
              type={type}
              content={content}
              videoId={videoId ?? null}
              quizData={quizData}
              transcript={transcript ?? null}
              sessionInfo={sessionInfo ?? null}
              lessonId={lessonId}
              initialPositionSeconds={initialPositionSeconds}
              initialCompleted={initialCompleted}
            />

            <UpNext
              learnBasePath={learnBasePath}
              overviewPath={overviewPath}
              nextLesson={nextLesson}
            />
          </div>

          {tocItems.length > 0 && (
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-20">
                <TableOfContents items={tocItems} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}

function UpNext({
  learnBasePath,
  overviewPath,
  nextLesson,
}: {
  learnBasePath: string
  overviewPath: string
  nextLesson?: LessonInfo | null
}) {
  if (!nextLesson) {
    return (
      <div className="mt-16 border-t border-border pt-8">
        <Link
          href={overviewPath}
          className="group -mx-3 -my-2 block rounded-bc-xl px-3 py-2 hover:bg-foreground/5 transition-colors"
        >
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Done
          </div>
          <p className="mt-3 text-base font-medium text-foreground group-hover:text-primary transition-colors">
            Back to overview
          </p>
        </Link>
      </div>
    )
  }
  return (
    <div className="mt-16 border-t border-border pt-8">
      <Link
        href={`${learnBasePath}/${nextLesson.slug}`}
        className="group -mx-3 -my-2 block rounded-bc-xl px-3 py-2 hover:bg-foreground/5 transition-colors"
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ArrowRight className="h-4 w-4" />
          Up next
        </div>
        <p className="mt-3 text-base font-medium text-foreground group-hover:text-primary transition-colors">
          {nextLesson.title}
        </p>
      </Link>
    </div>
  )
}
