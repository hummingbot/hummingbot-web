"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Checkbox } from "@/botcamp/components/ui/checkbox"
import { HelpCircle, Plus, Trash2 } from "lucide-react"

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

interface QuizData {
  questions: QuizQuestion[]
}

interface QuizLessonEditorProps {
  quizData: unknown
  onQuizDataChange: (quizData: QuizData) => void
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export function QuizLessonEditor({
  quizData,
  onQuizDataChange,
}: QuizLessonEditorProps) {
  const data = (quizData as QuizData) || { questions: [] }
  const [questions, setQuestions] = useState<QuizQuestion[]>(data.questions || [])

  // Sync state when quizData prop changes (e.g., when loading a different lesson)
  useEffect(() => {
    const newData = (quizData as QuizData) || { questions: [] }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setQuestions(newData.questions || [])
  }, [quizData])

  const updateQuizData = (updatedQuestions: QuizQuestion[]) => {
    setQuestions(updatedQuestions)
    onQuizDataChange({ questions: updatedQuestions })
  }

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: generateId(),
      question: "",
      options: ["", ""],
      correctIndex: 0,
      explanation: "",
    }
    updateQuizData([...questions, newQuestion])
  }

  const removeQuestion = (questionId: string) => {
    updateQuizData(questions.filter((q) => q.id !== questionId))
  }

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    updateQuizData(
      questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q))
    )
  }

  const addOption = (questionId: string) => {
    updateQuizData(
      questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: [...q.options, ""],
          }
        }
        return q
      })
    )
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    updateQuizData(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = q.options.filter((_, i) => i !== optionIndex)
          // Adjust correctIndex if needed
          let newCorrectIndex = q.correctIndex
          if (optionIndex < q.correctIndex) {
            newCorrectIndex = q.correctIndex - 1
          } else if (optionIndex === q.correctIndex) {
            newCorrectIndex = 0
          }
          return {
            ...q,
            options: newOptions,
            correctIndex: Math.min(newCorrectIndex, newOptions.length - 1),
          }
        }
        return q
      })
    )
  }

  const updateOptionText = (questionId: string, optionIndex: number, text: string) => {
    updateQuizData(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options]
          newOptions[optionIndex] = text
          return { ...q, options: newOptions }
        }
        return q
      })
    )
  }

  const setCorrectOption = (questionId: string, optionIndex: number) => {
    updateQuizData(
      questions.map((q) => {
        if (q.id === questionId) {
          return { ...q, correctIndex: optionIndex }
        }
        return q
      })
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Quiz Questions
        </CardTitle>
        <CardDescription>
          Create multiple choice questions for this quiz
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-bc-6">
        {/* Questions */}
        <div className="space-y-bc-4">
          {questions.map((question, qIndex) => (
            <div
              key={question.id}
              className="border rounded-bc-lg p-4 bg-muted/30 space-y-bc-4"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-muted-foreground">
                  Question {qIndex + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(question.id)}
                  className="ml-auto text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-bc-2">
                <Label>Question</Label>
                <Textarea
                  value={question.question}
                  onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                  placeholder="Enter your question..."
                  rows={2}
                />
              </div>

              <div className="space-y-bc-2">
                <Label>Options</Label>
                <div className="space-y-bc-2">
                  {question.options.map((optionText, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <Checkbox
                        checked={question.correctIndex === oIndex}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCorrectOption(question.id, oIndex)
                          }
                        }}
                      />
                      <Input
                        value={optionText}
                        onChange={(e) => updateOptionText(question.id, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className="flex-1"
                      />
                      {question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(question.id, oIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => addOption(question.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-bc-2">
                <Label>Explanation (optional)</Label>
                <Textarea
                  value={question.explanation || ""}
                  onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                  placeholder="Explain the correct answer..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={addQuestion} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>

        {questions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No questions yet. Add your first question to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
