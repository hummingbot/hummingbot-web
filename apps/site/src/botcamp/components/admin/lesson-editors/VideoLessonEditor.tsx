"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import { Video, FileText, ScrollText } from "lucide-react"
import { parseLessonVideo, VIDEO_IFRAME_SANDBOX } from "@/botcamp/lib/video-embed"


interface VideoLessonEditorProps {
  videoId: string
  content: string
  transcript: string
  onVideoIdChange: (videoId: string) => void
  onContentChange: (content: string) => void
  onTranscriptChange: (transcript: string) => void
}

export function VideoLessonEditor({
  videoId,
  content,
  transcript,
  onVideoIdChange,
  onContentChange,
  onTranscriptChange,
}: VideoLessonEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Content
        </CardTitle>
        <CardDescription>
          Configure video embed and supplementary content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="video" className="space-y-bc-4">
          <TabsList>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Transcript
            </TabsTrigger>
          </TabsList>

          <TabsContent value="video" className="space-y-bc-4">
            <div className="space-y-bc-2">
              <Label htmlFor="videoId">Video ID</Label>
              <Input
                id="videoId"
                value={videoId}
                onChange={(e) => onVideoIdChange(e.target.value)}
                placeholder="Vimeo or YouTube video ID"
              />
              <p className="text-sm text-muted-foreground">
                Enter the video ID from Vimeo (e.g., 123456789) or YouTube (e.g., dQw4w9WgXcQ)
              </p>
            </div>

            {videoId && (
              <div className="space-y-bc-2">
                <Label>Preview</Label>
                {parseLessonVideo(videoId) ? (
                  <div className="aspect-video bg-black rounded-bc-lg overflow-hidden">
                    <iframe
                      src={parseLessonVideo(videoId)!.embedUrl}
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

          <TabsContent value="notes" className="space-y-bc-4">
            <div className="space-y-bc-2">
              <Label htmlFor="content">Lesson Notes (Markdown)</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Add supplementary notes, resources, or code examples in markdown format..."
                className="min-h-[400px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                These notes appear below the video player. Use markdown for formatting.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="transcript" className="space-y-bc-4">
            <div className="space-y-bc-2">
              <Label htmlFor="transcript">Video Transcript (Markdown)</Label>
              <Textarea
                id="transcript"
                value={transcript}
                onChange={(e) => onTranscriptChange(e.target.value)}
                placeholder="Paste or type the video transcript here. Use **[MM:SS]** for timestamps..."
                className="min-h-[400px] font-mono text-sm"
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
  )
}
