import { Download, ExternalLink, FileCode, ImageIcon, PlayCircle } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { strategyTypeColors } from "@/botcamp/lib/design-constants"
import { cn } from "@/botcamp/lib/utils"
import { formatRelativeTime } from "@/botcamp/lib/format"
import { parseVideoUrl, VIDEO_IFRAME_SANDBOX } from "@/botcamp/lib/video-embed"
import type { ReviewStrategy } from "./application-review"
import type { ReactNode } from "react"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface StrategyReviewCardProps {
  strategy: ReviewStrategy | null
  /** Rendered top-right, opposite the title (e.g. status badges, an edit-strategy link). */
  headerActions?: ReactNode
  /** Rendered inline after the strategy-type badge (e.g. an admin-only status badge). */
  typeBadgeExtra?: ReactNode
  /** Rendered at the top of the card body, before the summary (e.g. a preference-rank callout). */
  topContent?: ReactNode
}

/** The strategy details card shared by the admin and team application review screens. */
export function StrategyReviewCard({
  strategy,
  headerActions,
  typeBadgeExtra,
  topContent,
}: StrategyReviewCardProps) {
  if (!strategy) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No agent selected for this application.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{strategy.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn(strategyTypeColors[strategy.strategyType] || strategyTypeColors.OTHER)}
              >
                {strategy.strategyType}
              </Badge>
              {typeBadgeExtra}
              {strategy.exchanges.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {strategy.exchanges.join(", ")}
                </span>
              )}
            </div>
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {topContent}

        {strategy.summary && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Summary</h3>
            <p className="text-sm">{strategy.summary}</p>
          </div>
        )}

        {strategy.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {strategy.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {strategy.details && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Details</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={strategy.details} />
            </div>
          </div>
        )}

        {strategy.videoURL && (() => {
          const embed = parseVideoUrl(strategy.videoURL)

          // Only YouTube/Vimeo/Loom/Drive links are framed, and only through
          // the embed URL parseVideoUrl builds. Anything else is offered as a
          // plain http(s) link in a new tab — never framed, and never a
          // javascript: href.
          if (!embed) {
            if (!/^https?:\/\//i.test(strategy.videoURL)) return null
            return (
              <Button variant="outline" size="sm" asChild>
                <a href={strategy.videoURL} target="_blank" rel="noopener noreferrer">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Watch Demo Video
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            )
          }

          return (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Demo Video</h3>
              <div className="aspect-video w-full rounded-bc-lg overflow-hidden bg-black">
                <iframe
                  src={embed.embedUrl}
                  className="w-full h-full"
                  title={`${strategy.title} demo video`}
                  sandbox={VIDEO_IFRAME_SANDBOX}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )
        })()}

        {strategy.files.length > 0 && (
          <div className="space-y-bc-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Files ({strategy.files.length})
              </h3>
              {strategy.files.length > 1 && (
                <ReadOnlyHint><Button variant="outline" size="sm" disabled>
                  <Download className="mr-2 h-3 w-3" />
                    Download All
                </Button></ReadOnlyHint>
              )}
            </div>
            {strategy.files.map((file) => (
              <div key={file.id} className="rounded-bc-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 text-sm font-medium">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  {file.type === "LINK" ? (
                    <a
                      href={file.url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {file.filename}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span>{file.filename}</span>
                  )}
                </div>
                {file.type === "FILE" && file.content && (
                  <pre className="p-3 text-xs overflow-x-auto max-h-96 bg-background">
                    <code>{file.content}</code>
                  </pre>
                )}
                {/* No inline preview for a binary (a zip of the agent, say) —
                    link the download route so a reviewer can still open it. */}
                {file.type === "FILE" && !file.content && (
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      {file.mimeType || "Binary file"} — preview not available
                    </p>
                    <ReadOnlyHint><Button variant="outline" size="sm" disabled>
                      <Download className="mr-2 h-3 w-3" />
                        Download
                    </Button></ReadOnlyHint>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {strategy.images.length > 0 && (
          <div className="space-y-bc-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Resources ({strategy.images.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {strategy.images.map((image) => (
                <a
                  key={image.id}
                  href={`/api/strategies/${strategy.slug}/images/${image.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-bc-lg border border-border overflow-hidden hover:border-primary transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/strategies/${strategy.slug}/images/${image.id}`}
                    alt={image.filename}
                    className="w-full max-h-64 object-contain bg-background"
                  />
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{image.filename}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Updated {formatRelativeTime(strategy.updatedAt)}
        </div>
      </CardContent>
    </Card>
  )
}
