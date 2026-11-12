"use client"

import { MarkdownContent } from "./MarkdownContent"

interface ArticleLessonProps {
  content: string
}

export function ArticleLesson({ content }: ArticleLessonProps) {
  return (
    <article>
      <MarkdownContent content={content} />
    </article>
  )
}
