"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/botcamp/components/ui/accordion"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { Button } from "@/botcamp/components/ui/button"

interface FAQItem {
  q: string
  a: string
}

interface FAQAccordionProps {
  items: FAQItem[]
  initialCount?: number
}

export function FAQAccordion({ items, initialCount = 4 }: FAQAccordionProps) {
  const [expanded, setExpanded] = useState(false)
  const visibleItems = expanded ? items : items.slice(0, initialCount)
  const hasMore = items.length > initialCount

  return (
    <div>
      <Accordion type="single" collapsible className="w-full">
        {visibleItems.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border-border">
            <AccordionTrigger className="text-left text-base md:text-lg font-semibold hover:text-primary transition-colors py-5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-5">
              <MarkdownContent content={item.a} className="prose-sm" />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? (
              <>
                Show less
                <ChevronUp className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Show more
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
