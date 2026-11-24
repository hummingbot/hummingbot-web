"use client"

import { useState, useEffect } from "react"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Checkbox } from "@/botcamp/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import { Video, FileText, ScrollText, Calendar, Settings, Presentation, ExternalLink } from "lucide-react"
import { parseLessonVideo, VIDEO_IFRAME_SANDBOX } from "@/botcamp/lib/video-embed"

export interface LessonFormData {
  id?: string
  slug?: string
  title?: string
  type?: string
  duration?: number | null
  isFree?: boolean
  videoId?: string | null
  content?: string | null
  transcript?: string | null
  slidesURL?: string | null
}

// Session metadata stored in content field for cohort lessons
interface SessionMetadata {
  sessionType?: string
  sessionDate?: string
  sessionTime?: string
  description?: string
}

function parseSessionMetadata(content: string | null): SessionMetadata | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (parsed.sessionType || parsed.sessionDate || parsed.sessionTime || parsed.description) {
      return parsed as SessionMetadata
    }
  } catch {
    // Not JSON, return null
  }
  return null
}

function encodeSessionMetadata(metadata: SessionMetadata): string {
  return JSON.stringify(metadata)
}


interface LessonEditorModalProps {
  lessonForm: LessonFormData
  onFormChange: (updates: Partial<LessonFormData>) => void
  onSave: () => void
  onCancel: () => void
  /** Whether this is a cohort lesson (shows Session Info section) */
  isCohortLesson?: boolean
}

export function LessonEditorModal({
  lessonForm,
  onFormChange,
  onSave,
  onCancel,
  isCohortLesson = false,
}: LessonEditorModalProps) {
  // Check if content contains session metadata (cohort lessons)
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata | null>(null)

  useEffect(() => {
    const metadata = parseSessionMetadata(lessonForm.content ?? null)
    if (metadata) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
      setSessionMetadata(metadata)
    } else if (isCohortLesson) {
      // Initialize empty session metadata for cohort lessons
      setSessionMetadata({})
    } else {
      setSessionMetadata(null)
    }
  }, [lessonForm.id, isCohortLesson]) // Only re-parse when lesson changes

  const handleSessionMetadataChange = (updates: Partial<SessionMetadata>) => {
    const newMetadata = { ...sessionMetadata, ...updates }
    setSessionMetadata(newMetadata)
    onFormChange({ content: encodeSessionMetadata(newMetadata) })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit Lesson</CardTitle>
          <CardDescription>Configure lesson details and content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-bc-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Basic Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-bc-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-bc-2">
                  <Label>Title</Label>
                  <Input
                    value={lessonForm.title || ""}
                    onChange={(e) => onFormChange({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-bc-2">
                  <Label>Slug</Label>
                  <Input
                    value={lessonForm.slug || ""}
                    onChange={(e) => onFormChange({ slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-bc-2">
                  <Label>Type</Label>
                  <Select
                    value={lessonForm.type || "VIDEO"}
                    onValueChange={(value) => onFormChange({ type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIDEO">Video</SelectItem>
                      <SelectItem value="ARTICLE">Article</SelectItem>
                      <SelectItem value="QUIZ">Quiz</SelectItem>
                      <SelectItem value="CHALLENGE">Challenge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-bc-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={lessonForm.duration || ""}
                    onChange={(e) =>
                      onFormChange({ duration: parseInt(e.target.value) || null })
                    }
                  />
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Checkbox
                    id="lessonFree"
                    checked={lessonForm.isFree || false}
                    onCheckedChange={(checked) =>
                      onFormChange({ isFree: checked === true })
                    }
                  />
                  <Label htmlFor="lessonFree">Free</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Metadata Card - for cohort lessons */}
          {isCohortLesson && sessionMetadata && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Session Info
                </CardTitle>
                <CardDescription>Cohort session scheduling details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-bc-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-bc-2">
                    <Label>Session Date</Label>
                    <Input
                      type="date"
                      value={sessionMetadata.sessionDate || ""}
                      onChange={(e) =>
                        handleSessionMetadataChange({ sessionDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-bc-2">
                    <Label>Session Time</Label>
                    <Input
                      value={sessionMetadata.sessionTime || ""}
                      onChange={(e) =>
                        handleSessionMetadataChange({ sessionTime: e.target.value })
                      }
                      placeholder="e.g., 15:00 UTC"
                    />
                  </div>
                  <div className="space-y-bc-2">
                    <Label>Session Type</Label>
                    <Input
                      value={sessionMetadata.sessionType || ""}
                      onChange={(e) =>
                        handleSessionMetadataChange({ sessionType: e.target.value })
                      }
                      placeholder="e.g., theory, technical"
                    />
                  </div>
                </div>
                <div className="space-y-bc-2">
                  <Label>Session Description</Label>
                  <Textarea
                    value={sessionMetadata.description || ""}
                    onChange={(e) =>
                      handleSessionMetadataChange({ description: e.target.value })
                    }
                    rows={3}
                    placeholder="Description shown when video is not yet available"
                  />
                </div>
                <div className="space-y-bc-2">
                  <Label className="flex items-center gap-2">
                    <Presentation className="h-4 w-4" />
                    Slides URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={lessonForm.slidesURL || ""}
                      onChange={(e) =>
                        onFormChange({ slidesURL: e.target.value || null })
                      }
                      placeholder="https://drive.google.com/... or PDF URL"
                      className="flex-1"
                    />
                    {lessonForm.slidesURL && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(lessonForm.slidesURL!, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Link to presentation slides (Google Slides, PDF, or other URL)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Content Card with Tabs */}
          {lessonForm.type === "VIDEO" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video Content
                </CardTitle>
                <CardDescription>Configure video embed and supplementary content</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="video" className="space-y-bc-4">
                  <TabsList>
                    <TabsTrigger value="video" className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video
                    </TabsTrigger>
                    {/* Notes tab only for course lessons - cohort lessons use content for session metadata */}
                    {!isCohortLesson && (
                      <TabsTrigger value="notes" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notes
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="transcript" className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4" />
                      Transcript
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="video" className="space-y-bc-4">
                    <div className="space-y-bc-2">
                      <Label>Video ID (Vimeo/YouTube/Loom/Drive)</Label>
                      <Input
                        value={lessonForm.videoId || ""}
                        onChange={(e) =>
                          onFormChange({ videoId: e.target.value || null })
                        }
                        placeholder="Enter video ID or URL"
                      />
                      <p className="text-sm text-muted-foreground">
                        Enter video ID or full URL from YouTube, Vimeo, Loom, or Google Drive
                      </p>
                    </div>

                    {lessonForm.videoId && (
                      <div className="space-y-bc-2">
                        <Label>Preview</Label>
                        {parseLessonVideo(lessonForm.videoId) ? (
                          <div className="aspect-video bg-black rounded-bc-lg overflow-hidden">
                            <iframe
                              src={parseLessonVideo(lessonForm.videoId)!.embedUrl}
                              className="w-full h-full"
                              sandbox={VIDEO_IFRAME_SANDBOX}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-muted rounded-bc-lg flex items-center justify-center border">
                            <div className="text-center text-muted-foreground">
                              <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Invalid video URL or ID</p>
                              <p className="text-xs">Enter a valid YouTube, Vimeo, Loom, or Google Drive URL</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {!isCohortLesson && (
                    <TabsContent value="notes" className="space-y-bc-4">
                      <div className="space-y-bc-2">
                        <Label>Notes (Markdown)</Label>
                        <Textarea
                          value={lessonForm.content || ""}
                          onChange={(e) =>
                            onFormChange({ content: e.target.value || null })
                          }
                          rows={10}
                          className="font-mono text-sm"
                          placeholder="Add supplementary notes, resources, or code examples (shown below the video)"
                        />
                        <p className="text-sm text-muted-foreground">
                          These notes appear below the video player. Use markdown for formatting.
                        </p>
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="transcript" className="space-y-bc-4">
                    <div className="space-y-bc-2">
                      <Label>Transcript (Markdown)</Label>
                      <Textarea
                        value={lessonForm.transcript || ""}
                        onChange={(e) =>
                          onFormChange({ transcript: e.target.value || null })
                        }
                        rows={10}
                        className="font-mono text-sm"
                        placeholder="Enter video transcript (shown in expandable section below video)"
                      />
                      <p className="text-sm text-muted-foreground">
                        The transcript appears in an expandable section below the video.
                        Use <code className="bg-muted px-1 rounded">**[MM:SS]**</code> for timestamps.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Content for non-video course lessons */}
          {!isCohortLesson && lessonForm.type !== "VIDEO" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-bc-2">
                  <Label>Content (Markdown)</Label>
                  <Textarea
                    value={lessonForm.content || ""}
                    onChange={(e) =>
                      onFormChange({ content: e.target.value || null })
                    }
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="Enter lesson content in markdown"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slides URL for course lessons (cohort lessons have slides in Session Info) */}
          {!isCohortLesson && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Presentation className="h-4 w-4" />
                  Slides
                </CardTitle>
                <CardDescription>Optional presentation slides for this lesson</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-bc-2">
                  <Label>Slides URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={lessonForm.slidesURL || ""}
                      onChange={(e) =>
                        onFormChange({ slidesURL: e.target.value || null })
                      }
                      placeholder="https://drive.google.com/... or PDF URL"
                      className="flex-1"
                    />
                    {lessonForm.slidesURL && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(lessonForm.slidesURL!, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Link to presentation slides (Google Slides, PDF, or other URL)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save Lesson</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
