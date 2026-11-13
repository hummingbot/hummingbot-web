"use client";

import { useState } from "react";
import { cn } from "@hummingbot/ui";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

/**
 * Click-to-play YouTube embed. Until the visitor presses play it is just the
 * video's thumbnail and a button, so the page doesn't load YouTube's player
 * (~0.5–2 MB of script) for videos nobody watches. On click the iframe takes
 * the same box (16:9 by default, or the parent's size via `className`) and
 * starts playing.
 */
export function YouTubeFacade({
  videoId,
  title,
  start,
  sandbox,
  className,
  priority = false,
}: {
  /** Load the thumbnail eagerly with high priority (when it's the LCP element). */
  priority?: boolean;
  /** An 11-character YouTube video ID. */
  videoId: string;
  /** Accessible name of the video; the button reads "Play video: <title>". */
  title: string;
  /** Start position in seconds. */
  start?: number;
  /** Optional iframe `sandbox`, passed through unchanged. */
  sandbox?: string;
  /** Classes for the outer box. Defaults to a full-width 16:9 box. */
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  if (!YOUTUBE_ID.test(videoId)) return null;

  const params = new URLSearchParams({ autoplay: "1", rel: "0" });
  if (start && start > 0) params.set("start", String(Math.floor(start)));

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-black", className)}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`}
          title={title}
          sandbox={sandbox}
          allow={ALLOW}
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- third-party thumbnail, already sized by YouTube */}
          <img
            // Sharp 1280px thumbnail; videos without one get YouTube's 120px
            // placeholder (or an error), so fall back to the 480px one.
            src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth <= 120 && !img.src.endsWith("/hqdefault.jpg")) img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }}
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.endsWith("/hqdefault.jpg")) img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }}
            alt=""
            width={1280}
            height={720}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 flex h-12 w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-black/75 transition-colors group-hover:bg-[#f00] group-focus-visible:bg-[#f00]"
          >
            <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
