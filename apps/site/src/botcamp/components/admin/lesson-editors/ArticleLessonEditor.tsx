"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { FileText, Eye, Edit } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"

interface ArticleLessonEditorProps {
  content: string
  onContentChange: (content: string) => void
}

export function ArticleLessonEditor({
  content,
  onContentChange,
}: ArticleLessonEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Article Content
        </CardTitle>
        <CardDescription>
          Write your article content in markdown format
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="edit" className="space-y-bc-4">
          <TabsList>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-bc-4">
            <div className="space-y-bc-2">
              <Label htmlFor="content">Content (Markdown)</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Write your article content in markdown format..."
                className="min-h-[500px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Supports headers, lists, code blocks, links, images, and more.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-bc-4">
            <div className="border rounded-bc-lg p-6 min-h-[500px] bg-card">
              {content ? (
                <MarkdownContent content={content} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No content yet. Start writing in the Edit tab.</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
