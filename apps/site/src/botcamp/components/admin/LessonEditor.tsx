"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Checkbox } from "@/botcamp/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import {
  Save,
  Loader2,
  PlayCircle,
  FileText,
  HelpCircle,
  Code,
  ChevronRight,
  Pencil,
  Eye,
} from "lucide-react"
import {
  VideoLessonEditor,
  ArticleLessonEditor,
  QuizLessonEditor,
  ChallengeLessonEditor,
} from "@/botcamp/components/admin/lesson-editors"
import { LessonContent } from "@/botcamp/components/lessons/LessonContent"
import { LessonHeader } from "@/botcamp/components/lessons/LessonHeader"

interface Lesson {
  id: string
  slug: string
  title: string
  type: string
  content: string | null
  transcript: string | null
  videoId: string | null
  duration: number | null
  isFree: boolean
  quizData: unknown
  sortOrder: number
}

interface Course {
  id: string
  title: string
  slug: string
}

interface LessonEditorProps {
  lesson: Lesson
  course: Course
}

const lessonTypeIcons = {
  VIDEO: PlayCircle,
  ARTICLE: FileText,
  QUIZ: HelpCircle,
  CHALLENGE: Code,
}

const lessonTypeDescriptions = {
  VIDEO: "Video content with optional transcript and notes",
  ARTICLE: "Written content in markdown format",
  QUIZ: "Interactive quiz with multiple choice questions",
  CHALLENGE: "Coding challenge or assignment",
}

export function LessonEditor({ lesson, course }: LessonEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")

  const [formData, setFormData] = useState({
    title: lesson.title,
    slug: lesson.slug,
    type: lesson.type,
    duration: lesson.duration,
    isFree: lesson.isFree,
    videoId: lesson.videoId || "",
    content: lesson.content || "",
    transcript: lesson.transcript || "",
    quizData: lesson.quizData,
  })

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/lessons/${lesson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          type: formData.type,
          duration: formData.duration,
          isFree: formData.isFree,
          videoId: formData.videoId || null,
          content: formData.content || null,
          transcript: formData.transcript || null,
          quizData: formData.quizData,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save lesson")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const TypeIcon = lessonTypeIcons[formData.type as keyof typeof lessonTypeIcons] || FileText

  return (
    <div className="space-y-bc-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/admin/courses"
            className="hover:text-foreground transition-colors"
          >
            Courses
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/admin/courses/${course.id}`}
            className="hover:text-foreground transition-colors"
          >
            {course.title}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{lesson.title}</span>
        </nav>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-sm text-destructive">{error}</span>
          )}
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Lesson
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Edit / Preview Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
        <TabsList>
          <TabsTrigger value="edit" className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "preview" ? (
        /* Preview Mode - Reuse lesson player components */
        <div className="space-y-bc-6">
          <LessonHeader
            title={formData.title}
            type={formData.type}
            duration={formData.duration}
            isFree={formData.isFree}
            breadcrumb={course.title}
          />
          <LessonContent
            type={formData.type}
            content={formData.content}
            videoId={formData.videoId}
            quizData={formData.quizData}
            transcript={formData.transcript}
          />
        </div>
      ) : (
        /* Edit Mode */
        <>
      {/* Lesson Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5" />
            Lesson Details
          </CardTitle>
          <CardDescription>
            {lessonTypeDescriptions[formData.type as keyof typeof lessonTypeDescriptions]}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="Lesson title"
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => updateFormData({ slug: e.target.value })}
                placeholder="lesson-slug"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => updateFormData({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">
                    <span className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Video
                    </span>
                  </SelectItem>
                  <SelectItem value="ARTICLE">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Article
                    </span>
                  </SelectItem>
                  <SelectItem value="QUIZ">
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Quiz
                    </span>
                  </SelectItem>
                  <SelectItem value="CHALLENGE">
                    <span className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Challenge
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration || ""}
                onChange={(e) =>
                  updateFormData({ duration: parseInt(e.target.value) || null })
                }
                placeholder="e.g., 15"
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                id="isFree"
                checked={formData.isFree}
                onCheckedChange={(checked) =>
                  updateFormData({ isFree: checked === true })
                }
              />
              <Label htmlFor="isFree">Free lesson</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type-specific Content Editor */}
      {formData.type === "VIDEO" && (
        <VideoLessonEditor
          videoId={formData.videoId}
          content={formData.content}
          transcript={formData.transcript}
          onVideoIdChange={(videoId) => updateFormData({ videoId })}
          onContentChange={(content) => updateFormData({ content })}
          onTranscriptChange={(transcript) => updateFormData({ transcript })}
        />
      )}

      {formData.type === "ARTICLE" && (
        <ArticleLessonEditor
          content={formData.content}
          onContentChange={(content) => updateFormData({ content })}
        />
      )}

      {formData.type === "QUIZ" && (
        <QuizLessonEditor
          quizData={formData.quizData}
          onQuizDataChange={(quizData) => updateFormData({ quizData })}
        />
      )}

      {formData.type === "CHALLENGE" && (
        <ChallengeLessonEditor
          content={formData.content}
          challengeData={formData.quizData}
          onContentChange={(content) => updateFormData({ content })}
          onChallengeDataChange={(quizData) => updateFormData({ quizData })}
        />
      )}
        </>
      )}
    </div>
  )
}
