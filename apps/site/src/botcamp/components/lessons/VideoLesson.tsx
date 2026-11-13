"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/botcamp/components/ui/accordion"
import { Button } from "@/botcamp/components/ui/button"
import { CheckCircle2, Download, Presentation } from "lucide-react"
import { MarkdownContent } from "./MarkdownContent"
import { parseLessonVideo, youtubeVideoId, VIDEO_IFRAME_SANDBOX } from "@/botcamp/lib/video-embed"
import { YouTubeFacade } from "@/components/ui/youtube-facade"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

// Read-only preview: Botcamp's VideoLesson reports playback to
// /api/lessons/<id>/progress (useLessonVideoProgress + reportLessonProgress)
// and offers "Mark as watched" for Loom/Drive. Nothing is saved here, so the
// tracking is left out; the player resumes YouTube videos at the saved
// position via the embed's start parameter instead, and the manual control
// shows disabled.

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
    <div className="space-y-3">
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
  const embed = parseLessonVideo(videoId)
  const provider = embed?.provider ?? null
  const resumeAt = !initialCompleted && initialPositionSeconds > 0 ? Math.floor(initialPositionSeconds) : 0
  const embedUrl =
    embed && provider === "youtube" && resumeAt > 0 ? `${embed.embedUrl}?start=${resumeAt}` : embed?.embedUrl
  const youtubeId = embed && provider === "youtube" ? youtubeVideoId(embed.embedUrl) : null

  const needsManualComplete = !!lessonId && (provider === "loom" || provider === "gdrive")
  const completed = initialCompleted

  return (
    <div className="space-y-6">
      {/* Video player - full width */}
      {embedUrl ? (
        <div className="aspect-video bg-black rounded-bc-lg overflow-hidden">
          {youtubeId ? (
            // Resume position rides along as the facade's start parameter.
            <YouTubeFacade videoId={youtubeId} title="Lesson video" start={resumeAt} sandbox={VIDEO_IFRAME_SANDBOX} className="h-full" />
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              sandbox={VIDEO_IFRAME_SANDBOX}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
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
            <ReadOnlyHint>
              <Button variant="outline" size="sm" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as watched
              </Button>
            </ReadOnlyHint>
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
