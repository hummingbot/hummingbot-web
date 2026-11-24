"use client"

import { useEffect, useState } from "react"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { MarkdownContent } from "./MarkdownContent"
import { cn } from "@/botcamp/lib/utils"
import { Code, CheckCircle, ExternalLink, Eye, EyeOff } from "lucide-react"
import { reportLessonProgress } from "@/botcamp/lib/lesson-progress-client"
import { useSetLessonProgress } from "@/botcamp/components/learn/LessonProgressContext"

interface ChallengeStep {
  title: string
  description: string
  hint?: string
}

interface ChallengeLessonProps {
  content: string
  steps?: ChallengeStep[]
  starterCode?: string
  solutionCode?: string
  externalUrl?: string
  /** Identifies the lesson to the progress API. Omitted in admin preview
   *  contexts, where there's nothing to track. */
  lessonId?: string
  initialCompleted?: boolean
}

export function ChallengeLesson({
  content,
  steps = [],
  externalUrl,
  lessonId,
  initialCompleted,
}: ChallengeLessonProps) {
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(
    new Array(steps.length).fill(false)
  )
  const [showSolution, setShowSolution] = useState(!!initialCompleted)
  const [expandedHint, setExpandedHint] = useState<number | null>(null)
  const setLessonProgress = useSetLessonProgress()

  const toggleStepComplete = (index: number) => {
    const newCompleted = [...completedSteps]
    newCompleted[index] = !newCompleted[index]
    setCompletedSteps(newCompleted)
  }

  const completedCount = completedSteps.filter(Boolean).length
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  // Split content at "### Solution" to separate challenge from solution
  const solutionMarker = /^### Solution/m
  const parts = content.split(solutionMarker)
  const challengeContent = parts[0].trim()
  const solutionContent = parts.length > 1 ? "### Solution" + parts[1] : null

  const revealSolution = () => {
    setShowSolution(true)
    if (lessonId) {
      setLessonProgress(lessonId, "completed")
      reportLessonProgress(lessonId, 0, true)
    }
  }

  // Opening the challenge starts it. Challenges with no solution section
  // have no further action to gate on, so opening is also the completion
  // signal there — same as an ARTICLE lesson.
  useEffect(() => {
    if (!lessonId || initialCompleted) return
    if (solutionContent) {
      setLessonProgress(lessonId, "in-progress")
      reportLessonProgress(lessonId, 0, false)
    } else {
      setLessonProgress(lessonId, "completed")
      reportLessonProgress(lessonId, 0, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  return (
    <div className="space-y-bc-8">
      {/* Challenge description */}
      <div className="max-w-3xl">
        <MarkdownContent content={challengeContent} />
      </div>

      {/* External link */}
      {externalUrl && (
        <Card className="border-primary/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-primary" />
              <span>Complete this challenge on the external platform</span>
            </div>
            <Button asChild>
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                Open Challenge
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress tracker */}
      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Challenge Progress</CardTitle>
              <span className="text-sm text-muted-foreground">
                {completedCount} of {steps.length} steps completed
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-bc-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-bc-lg border transition-colors",
                  completedSteps[index]
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStepComplete(index)}
                    className={cn(
                      "mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                      completedSteps[index]
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-muted-foreground"
                    )}
                  >
                    {completedSteps[index] && (
                      <CheckCircle className="w-3 h-3" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h4 className={cn(
                      "font-medium",
                      completedSteps[index] && "line-through text-muted-foreground"
                    )}>
                      Step {index + 1}: {step.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                    {step.hint && (
                      <div className="mt-2">
                        <button
                          onClick={() =>
                            setExpandedHint(expandedHint === index ? null : index)
                          }
                          className="text-sm text-primary hover:underline"
                        >
                          {expandedHint === index ? "Hide hint" : "Show hint"}
                        </button>
                        {expandedHint === index && (
                          <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                            {step.hint}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Solution section - hidden behind button */}
      {solutionContent && (
        <div className="max-w-3xl">
          {!showSolution ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Try completing the challenge before viewing the solution.
                </p>
                <Button
                  variant="outline"
                  onClick={revealSolution}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Show Solution
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-bc-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSolution(false)}
                  className="gap-2 text-muted-foreground"
                >
                  <EyeOff className="w-4 h-4" />
                  Hide Solution
                </Button>
              </div>
              <MarkdownContent content={solutionContent} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
