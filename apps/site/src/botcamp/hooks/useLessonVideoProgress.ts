"use client"

import { useEffect, useRef, type RefObject } from "react"
import VimeoPlayer from "@vimeo/player"
import { COMPLETION_THRESHOLD, reportLessonProgress } from "@/botcamp/lib/lesson-progress-client"
import { useSetLessonProgress } from "@/botcamp/components/learn/LessonProgressContext"
import type { VideoProvider } from "@/botcamp/lib/video-embed"

// Persist playback position periodically without turning every active video
// into a high-frequency stream of database writes. Lifecycle events (play,
// pause, ended, and completion) still save immediately.
const REPORT_INTERVAL_MS = 60_000

interface YouTubePlayerLike {
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  destroy(): void
}

interface YouTubeStateChangeEvent {
  data: number
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        config: {
          events: {
            onReady?: () => void
            onStateChange?: (event: YouTubeStateChangeEvent) => void
          }
        },
      ) => YouTubePlayerLike
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<void> | null = null
function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      resolve()
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      document.head.appendChild(script)
    }
  })
  return youtubeApiPromise
}

interface UseLessonVideoProgressOptions {
  /** Omitted in admin preview contexts, where playback isn't tracked. */
  lessonId?: string
  /** Null when the lesson's video link didn't parse — nothing to track. */
  provider: VideoProvider | null
  iframeRef: RefObject<HTMLIFrameElement | null>
  initialPositionSeconds: number
  initialCompleted: boolean
}

/**
 * Wires up playback tracking for YouTube and Vimeo embeds: resumes at the
 * saved position, periodically reports the current position, and reports
 * `completed: true` once playback crosses `COMPLETION_THRESHOLD` (or the
 * video ends). No-ops for providers we can't get playback events from
 * (Loom, Google Drive) — those fall back to a manual "mark as watched"
 * control in `VideoLesson`.
 */
export function useLessonVideoProgress({
  lessonId,
  provider,
  iframeRef,
  initialPositionSeconds,
  initialCompleted,
}: UseLessonVideoProgressOptions) {
  const completedRef = useRef(initialCompleted)
  const setLessonProgress = useSetLessonProgress()

  useEffect(() => {
    completedRef.current = initialCompleted
  }, [initialCompleted])

  useEffect(() => {
    if (!lessonId) return
    if (provider !== "youtube" && provider !== "vimeo") return
    const iframe = iframeRef.current
    if (!iframe) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    // `ended` is a direct signal — always completes, regardless of the
    // reported position (some players report a slightly-short currentTime
    // right at the end event, which would otherwise miss the threshold).
    const report = (
      positionSeconds: number,
      duration: number,
      { force = false, ended = false }: { force?: boolean; ended?: boolean } = {},
    ) => {
      const justCompleted =
        ended || (duration > 0 && positionSeconds / duration >= COMPLETION_THRESHOLD)
      const completed = completedRef.current || justCompleted
      completedRef.current = completed
      // Updates the sidebar/outline immediately — no refresh needed to
      // see the in-progress dot or completed check appear.
      setLessonProgress(lessonId, completed ? "completed" : "in-progress")
      if (force || completed) {
        reportLessonProgress(lessonId, positionSeconds, completed)
      }
      return completed
    }

    if (provider === "youtube") {
      let intervalId: ReturnType<typeof setInterval> | undefined
      let player: YouTubePlayerLike | undefined

      loadYouTubeIframeApi().then(() => {
        if (cancelled || !iframeRef.current || !window.YT) return
        player = new window.YT.Player(iframeRef.current, {
          events: {
            onReady: () => {
              if (initialPositionSeconds > 0) {
                player?.seekTo(initialPositionSeconds, true)
              }
            },
            onStateChange: (event) => {
              const { PLAYING, PAUSED, ENDED } = window.YT!.PlayerState
              if (event.data === PLAYING) {
                // Report right away so the lesson shows "in progress"
                // immediately, not just once the first poll fires.
                report(Math.floor(player!.getCurrentTime()), player!.getDuration(), { force: true })
                intervalId = setInterval(() => {
                  if (!player) return
                  report(Math.floor(player.getCurrentTime()), player.getDuration(), { force: true })
                }, REPORT_INTERVAL_MS)
              } else if (event.data === PAUSED || event.data === ENDED) {
                if (intervalId) clearInterval(intervalId)
                if (player) {
                  report(Math.floor(player.getCurrentTime()), player.getDuration(), {
                    force: true,
                    ended: event.data === ENDED,
                  })
                }
              }
            },
          },
        })
      })

      cleanup = () => {
        if (intervalId) clearInterval(intervalId)
        try {
          player?.destroy()
        } catch {
          // iframe may already be gone
        }
      }
    }

    if (provider === "vimeo") {
      const player = new VimeoPlayer(iframe)
      if (initialPositionSeconds > 0) {
        player.setCurrentTime(initialPositionSeconds).catch(() => {})
      }

      let lastReportedAt = 0
      // Reports right away so the lesson shows "in progress" immediately
      // instead of waiting for the first throttled timeupdate.
      const onPlay = (data: { seconds: number; duration: number }) => {
        lastReportedAt = Date.now()
        report(Math.floor(data.seconds), data.duration, { force: true })
      }
      const onTimeUpdate = (data: { seconds: number; duration: number }) => {
        const now = Date.now()
        if (now - lastReportedAt < REPORT_INTERVAL_MS) return
        lastReportedAt = now
        report(Math.floor(data.seconds), data.duration, { force: true })
      }
      const onPause = (data: { seconds: number; duration: number }) => {
        lastReportedAt = Date.now()
        report(Math.floor(data.seconds), data.duration, { force: true })
      }
      const onEnded = (data: { seconds: number; duration: number }) => {
        lastReportedAt = Date.now()
        report(Math.floor(data.seconds), data.duration, { force: true, ended: true })
      }

      player.on("play", onPlay)
      player.on("timeupdate", onTimeUpdate)
      player.on("pause", onPause)
      player.on("ended", onEnded)

      cleanup = () => {
        player.off("play", onPlay)
        player.off("timeupdate", onTimeUpdate)
        player.off("pause", onPause)
        player.off("ended", onEnded)
      }
    }

    return () => {
      cancelled = true
      cleanup?.()
    }
    // Player wiring only depends on which iframe/provider we're attached
    // to — initialPositionSeconds/initialCompleted are read once, at
    // attach time, not tracked reactively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, lessonId, iframeRef])
}
