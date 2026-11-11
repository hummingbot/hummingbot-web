"use client"

import Link from "next/link"
import { getCohortBadgeClasses, capitalizeExchange } from "@/botcamp/lib/utils"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { StrategyCodeViewer } from "@/botcamp/components/strategies/StrategyCodeViewer"
import { StrategyImageGallery } from "@/botcamp/components/strategies/StrategyImageGallery"
import { getAvatarGradient } from "@/botcamp/lib/avatar"
import { FileItem } from "@/botcamp/components/ui/file-upload-manager"
import { parseVideoUrl, VIDEO_IFRAME_SANDBOX } from "@/botcamp/lib/video-embed"

interface StrategyImage {
  id: string
  filename: string
  mimeType: string
  size: number
  sortOrder: number
}

interface StrategyPreviewProps {
  title: string
  slug: string | null
  summary: string
  details: string
  tags: string[]
  exchanges: string[]
  videoURL?: string | null
  images: StrategyImage[]
  cohortNumber?: number | null
  files: FileItem[]
  authors?: Array<{
    id: string
    slug: string
    name: string
    avatarURL?: string | null
  }>
}

export function StrategyPreview({
  title,
  slug,
  summary,
  details,
  tags,
  exchanges,
  videoURL,
  images,
  cohortNumber,
  files,
  authors = [],
}: StrategyPreviewProps) {
  const embedUrl = videoURL ? parseVideoUrl(videoURL)?.embedUrl ?? null : null

  // Convert FileItem to StrategyFile format for StrategyCodeViewer
  const strategyFiles = files.map((f) => ({
    id: f.id,
    type: (f.type || "FILE") as "FILE" | "LINK",
    filename: f.filename,
    mimeType: f.mimeType ?? null,
    size: f.size ?? null,
    url: f.url ?? null,
    sortOrder: f.sortOrder ?? 0,
  }))

  return (
    <div className="bg-card rounded-bc-lg border">
      <div className="p-8">
        {/* Strategy Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-4">{title || "Untitled Strategy"}</h1>

          {/* Authors and Cohort */}
          {(authors.length > 0 || cohortNumber != null) && (
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {authors.map((author) => (
                <Link
                  key={author.id}
                  href={`/builders/${author.slug}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center"
                    style={getAvatarGradient(author.name)}
                  >
                    <span className="text-black font-bold text-xs">
                      {author.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{author.name}</span>
                </Link>
              ))}
              {cohortNumber === 0 ? (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCohortBadgeClasses(0)}`}
                >
                  Example
                </span>
              ) : cohortNumber ? (
                <Link href={`/cohorts/cohort${cohortNumber}`}>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCohortBadgeClasses(cohortNumber)} hover:opacity-80 cursor-pointer transition-opacity`}
                  >
                    Cohort {cohortNumber}
                  </span>
                </Link>
              ) : null}
            </div>
          )}

          {/* Tags and Exchanges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.length > 0 &&
              tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-bc-md text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"
                >
                  {tag}
                </span>
              ))}

            {exchanges.length > 0 &&
              exchanges.map((exchange) => (
                <span
                  key={exchange}
                  className="inline-flex items-center px-3 py-1 rounded-bc-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {capitalizeExchange(exchange)}
                </span>
              ))}

            {tags.length === 0 && exchanges.length === 0 && (
              <span className="text-sm text-muted-foreground italic">No tags or exchanges added</span>
            )}
          </div>
        </div>

        {/* Video Section */}
        {embedUrl && (
          <div className="mb-6">
            <div className="aspect-video w-full rounded-bc-xl overflow-hidden bg-black mb-6">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                title={title}
                sandbox={VIDEO_IFRAME_SANDBOX}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        {/* Images Section */}
        {images.length > 0 && slug && (
          <StrategyImageGallery
            images={images}
            strategySlug={slug}
            title={images.length === 1 ? "Flowchart" : "Flowchart & Images"}
          />
        )}

        {/* Summary */}
        {summary && (
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-3">Summary</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
          </div>
        )}

        {/* Detailed Description */}
        <div className="mb-6">
          {details ? (
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownContent content={details} />
            </div>
          ) : !summary ? (
            <p className="text-muted-foreground italic">No content added yet</p>
          ) : null}
        </div>
      </div>

      {/* Code Files Section */}
      {strategyFiles.length > 0 && slug && (
        <div className="px-8 pb-8">
          <StrategyCodeViewer
            files={strategyFiles}
            strategySlug={slug}
          />
        </div>
      )}
    </div>
  )
}
