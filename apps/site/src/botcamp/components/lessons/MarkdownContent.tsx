"use client"

import { useEffect, useState } from "react"
import { cn } from "@/botcamp/lib/utils"
import { renderMarkdown } from "@/botcamp/lib/markdown-utils"

interface MarkdownContentProps {
  content: string
  className?: string
  /** Convert single line breaks to <br> tags (useful for transcripts) */
  breaks?: boolean
}

export function MarkdownContent({ content, className, breaks = false }: MarkdownContentProps) {
  const [html, setHtml] = useState("")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setHtml(renderMarkdown(content, breaks))
  }, [content, breaks])

  return (
    <div
      className={cn("prose dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
