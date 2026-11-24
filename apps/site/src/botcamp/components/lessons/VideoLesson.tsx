"use client"

import { useRef, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/botcamp/components/ui/accordion"
import { Button } from "@/botcamp/components/ui/button"
import { CheckCircle2, Download, Presentation } from "lucide-react"
import { MarkdownContent } from "./MarkdownContent"
import { parseLessonVideo, VIDEO_IFRAME_SANDBOX } from "@/botcamp/lib/video-embed"
import { useLessonVideoProgress } from "@/botcamp/hooks/useLessonVideoProgress"
import { reportLessonProgress } from "@/botcamp/lib/lesson-progress-client"
import { useSetLessonProgress } from "@/botcamp/components/learn/LessonProgressContext"

// Renders transcript with markdown support and download button
function TranscriptContent({ content }: { content: string }) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "transcript.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-bc-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto pr-2">
        <MarkdownContent content={content} className="prose-sm" breaks />
      </div>
    </div>
  )
}

interface VideoLessonProps {
  videoId: string
  content?: string | null
  transcript?: string | null
  slidesURL?: string | null
  /** Identifies the lesson to the progress API. Omitted in admin preview
   *  contexts, where playback isn't tracked. */
  lessonId?: string
  /** Saved playback position (seconds) to resume at, if any. */
  initialPositionSeconds?: number
  /** Whether this lesson is already marked complete. */
  initialCompleted?: boolean
}

export function VideoLesson({
  videoId,
  content,
  transcript,
  slidesURL,
  lessonId,
  initialPositionSeconds = 0,
  initialCompleted = false,
}: VideoLessonProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [completed, setCompleted] = useState(initialCompleted)
  const setLessonProgress = useSetLessonProgress()

  const embed = parseLessonVideo(videoId)
  const provider = embed?.provider ?? null
  // YouTube's IFrame API needs this to let us listen for play state and
  // seek to the saved position — Vimeo's player library works against the
  // plain embed URL, no query param needed.
  const trackableEmbedUrl =
    embed && provider === "youtube" ? `${embed.embedUrl}?enablejsapi=1` : embed?.embedUrl

  useLessonVideoProgress({
    lessonId,
    provider,
    iframeRef,
    initialPositionSeconds,
    initialCompleted,
  })

  // Loom and Google Drive don't expose a playback API we can listen to, so
  // there's no reliable "actually watched it" signal — offer an explicit
  // control instead of silently never completing. Not shown when there's
  // no lessonId to track against (admin preview).
  const needsManualComplete = !!lessonId && (provider === "loom" || provider === "gdrive")

  const handleMarkWatched = () => {
    if (!lessonId) return
    setCompleted(true)
    setLessonProgress(lessonId, "completed")
    reportLessonProgress(lessonId, 0, true)
  }

  return (
    <div className="space-y-bc-6">
      {/* Video player - full width */}
      {trackableEmbedUrl ? (
        <div className="aspect-video bg-black rounded-bc-lg overflow-hidden">
          <iframe
            ref={iframeRef}
            src={trackableEmbedUrl}
            className="w-full h-full"
            sandbox={VIDEO_IFRAME_SANDBOX}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="rounded-bc-lg border border-border p-6 text-sm text-muted-foreground">
          This lesson&apos;s video link isn&apos;t a YouTube, Vimeo, Loom or Google Drive video, so it can&apos;t be shown.
        </div>
      )}

      {needsManualComplete && (
        <div className="flex items-center gap-3">
          {completed ? (
            <span className="inline-flex items-center gap-2 text-sm text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              Watched
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={handleMarkWatched}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as watched
            </Button>
          )}
        </div>
      )}

      {/* Slides button */}
      {slidesURL && (
        <div className="flex">
          <Button
            variant="outline"
            onClick={() => window.open(slidesURL, "_blank")}
          >
            <Presentation className="h-4 w-4 mr-2" />
            View Slides
          </Button>
        </div>
      )}

      {/* Transcript accordion */}
      {transcript && (
        <Accordion type="single" collapsible className="border rounded-bc-lg">
          <AccordionItem value="transcript" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              View Transcript
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <TranscriptContent content={transcript} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Content directly below video */}
      {content && <MarkdownContent content={content} />}
    </div>
  )
}
