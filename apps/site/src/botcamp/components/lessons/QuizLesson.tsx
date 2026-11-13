"use client"

import { useState } from "react"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { cn } from "@/botcamp/lib/utils"
import { CheckCircle, HelpCircle } from "lucide-react"
import { READ_ONLY_TITLE } from "@/botcamp/components/ui/read-only"

// Read-only preview: answering works as in Botcamp (it's all in the browser),
// but Botcamp also reports "started"/"finished" to /api/lessons/<id>/progress.
// Nothing is saved here, so those reports are left out and the result says so.

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

interface QuizLessonProps {
  questions: QuizQuestion[]
}

export function QuizLesson({ questions }: QuizLessonProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    new Array(questions.length).fill(null)
  )
  const [showResults, setShowResults] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const handleSelectAnswer = (optionIndex: number) => {
    if (showResults) return

    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = optionIndex
    setSelectedAnswers(newAnswers)
    setShowExplanation(true)
  }

  const handleNextQuestion = () => {
    setShowExplanation(false)
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResults(true)
    }
  }

  const handlePreviousQuestion = () => {
    setShowExplanation(false)
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleRetry = () => {
    setSelectedAnswers(new Array(questions.length).fill(null))
    setCurrentQuestion(0)
    setShowResults(false)
    setShowExplanation(false)
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctIndex) {
        correct++
      }
    })
    return Math.round((correct / questions.length) * 100)
  }

  if (showResults) {
    const score = calculateScore()
    const correctCount = selectedAnswers.filter((a, i) => a === questions[i].correctIndex).length

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-primary/10">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <p className="text-4xl font-bold">{score}%</p>
            <p className="text-muted-foreground">
              {correctCount} of {questions.length} correct
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            {READ_ONLY_TITLE}: this result isn&apos;t saved.
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={handleRetry}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const question = questions[currentQuestion]
  const selectedAnswer = selectedAnswers[currentQuestion]
  const isCorrect = selectedAnswer === question.correctIndex

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Question {currentQuestion + 1} of {questions.length}</span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full",
                i === currentQuestion
                  ? "bg-primary"
                  : selectedAnswers[i] !== null
                  ? selectedAnswers[i] === questions[i].correctIndex
                    ? "bg-green-500"
                    : "bg-red-500"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <HelpCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <CardTitle className="text-xl">{question.question}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectAnswer(index)}
              disabled={showExplanation}
              className={cn(
                "w-full p-4 text-left rounded-bc-lg border transition-colors",
                selectedAnswer === index
                  ? showExplanation
                    ? isCorrect
                      ? "border-green-500 bg-green-500/10"
                      : "border-red-500 bg-red-500/10"
                    : "border-primary bg-primary/10"
                  : showExplanation && index === question.correctIndex
                  ? "border-green-500 bg-green-500/10"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border",
                    selectedAnswer === index
                      ? showExplanation
                        ? isCorrect
                          ? "border-green-500 text-green-500"
                          : "border-red-500 text-red-500"
                        : "border-primary text-primary"
                      : showExplanation && index === question.correctIndex
                      ? "border-green-500 text-green-500"
                      : "border-muted-foreground text-muted-foreground"
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Explanation */}
      {showExplanation && question.explanation && (
        <Card className={cn(
          "border-l-4",
          isCorrect ? "border-l-green-500" : "border-l-red-500"
        )}>
          <CardContent className="pt-6">
            <p className="font-medium mb-2">
              {isCorrect ? "Correct!" : "Not quite right"}
            </p>
            <p className="text-muted-foreground">{question.explanation}</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>
        <Button
          onClick={handleNextQuestion}
          disabled={selectedAnswer === null}
        >
          {currentQuestion === questions.length - 1 ? "See Results" : "Next"}
        </Button>
      </div>
    </div>
  )
}
