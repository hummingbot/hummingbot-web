"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import { Code, Eye, Edit, FileCode, FileCheck, Link } from "lucide-react"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"

interface ChallengeData {
  starterCode?: string
  solutionCode?: string
  externalUrl?: string
}

interface ChallengeLessonEditorProps {
  content: string
  challengeData: unknown
  onContentChange: (content: string) => void
  onChallengeDataChange: (data: ChallengeData) => void
}

export function ChallengeLessonEditor({
  content,
  challengeData,
  onContentChange,
  onChallengeDataChange,
}: ChallengeLessonEditorProps) {
  const data = (challengeData as ChallengeData) || {}

  const [starterCode, setStarterCode] = useState(data.starterCode || "")
  const [solutionCode, setSolutionCode] = useState(data.solutionCode || "")
  const [externalUrl, setExternalUrl] = useState(data.externalUrl || "")

  // Sync state when challengeData prop changes (e.g., when loading a different lesson)
  useEffect(() => {
    const newData = (challengeData as ChallengeData) || {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setStarterCode(newData.starterCode || "")
    setSolutionCode(newData.solutionCode || "")
    setExternalUrl(newData.externalUrl || "")
  }, [challengeData])

  const updateChallengeData = (updates: Partial<ChallengeData>) => {
    const newData: ChallengeData = {
      starterCode,
      solutionCode,
      externalUrl: externalUrl || undefined,
      ...updates,
    }
    // Clean up empty values
    if (!newData.starterCode) delete newData.starterCode
    if (!newData.solutionCode) delete newData.solutionCode
    if (!newData.externalUrl) delete newData.externalUrl

    onChallengeDataChange(newData)
  }

  const handleStarterCodeChange = (value: string) => {
    setStarterCode(value)
    updateChallengeData({ starterCode: value || undefined })
  }

  const handleSolutionCodeChange = (value: string) => {
    setSolutionCode(value)
    updateChallengeData({ solutionCode: value || undefined })
  }

  const handleExternalUrlChange = (value: string) => {
    setExternalUrl(value)
    updateChallengeData({ externalUrl: value || undefined })
  }

  return (
    <div className="space-y-bc-6">
      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Challenge Content
          </CardTitle>
          <CardDescription>
            Define the challenge instructions, requirements, and starter code
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
                <Label htmlFor="content">Challenge Instructions (Markdown)</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder={`## Goal
Describe what the student needs to accomplish...

## Instructions
1. Step one
2. Step two
3. Step three

## Hints
- Hint 1
- Hint 2`}
                  className="min-h-[400px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Include objectives, requirements, starter code, hints, and submission instructions.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-bc-4">
              <div className="border rounded-bc-lg p-6 min-h-[400px] bg-card">
                {content ? (
                  <MarkdownContent content={content} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Code className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No content yet. Start writing in the Edit tab.</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* External URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            External Platform
          </CardTitle>
          <CardDescription>
            Optional link to an external platform (e.g., GitHub Classroom, Replit)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-bc-2">
            <Label htmlFor="externalUrl">External URL</Label>
            <Input
              id="externalUrl"
              value={externalUrl}
              onChange={(e) => handleExternalUrlChange(e.target.value)}
              placeholder="https://github.com/classroom/..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Code Files Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Code Files
          </CardTitle>
          <CardDescription>
            Provide starter code and solution code for the challenge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="starter" className="space-y-bc-4">
            <TabsList>
              <TabsTrigger value="starter" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Starter Code
              </TabsTrigger>
              <TabsTrigger value="solution" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Solution Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="starter" className="space-y-bc-4">
              <div className="space-y-bc-2">
                <Label htmlFor="starterCode">Starter Code</Label>
                <Textarea
                  id="starterCode"
                  value={starterCode}
                  onChange={(e) => handleStarterCodeChange(e.target.value)}
                  placeholder={`# starter_code.py
# Students will start with this code

def solution():
    # TODO: Implement the solution
    pass`}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  The starting point code that students will work with.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="solution" className="space-y-bc-4">
              <div className="space-y-bc-2">
                <Label htmlFor="solutionCode">Solution Code</Label>
                <Textarea
                  id="solutionCode"
                  value={solutionCode}
                  onChange={(e) => handleSolutionCodeChange(e.target.value)}
                  placeholder={`# solution.py
# The complete solution for reference

def solution():
    # Complete implementation
    return result`}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  The complete solution (hidden until student chooses to reveal).
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
