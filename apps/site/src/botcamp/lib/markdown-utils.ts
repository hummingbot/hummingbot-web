// Markdown utility functions: rendering, extracting headings, creating slugs

export interface TocItem {
  id: string
  text: string
  level: number
}

// Helper function to extract headings from markdown content
export function extractHeadings(content: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const headings: TocItem[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = slugify(text)
    headings.push({ id, text, level })
  }

  return headings
}

// Helper function to create URL-friendly slugs
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim()
}

/**
 * The rendered output goes through dangerouslySetInnerHTML, so every piece of
 * author-supplied text must be escaped before it lands in the markup. Quotes
 * matter as much as angle brackets: an unescaped " inside an href closes the
 * attribute and lets the author add an event handler.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Only allow URL schemes that can't execute script. Browsers ignore control
 * characters when parsing a scheme, so strip those before testing — otherwise
 * "java\tscript:..." slips past the check and still runs.
 */
function safeUrl(url: string): string {
  const cleaned = url.replace(/[\u0000-\u0020]/g, "")
  const isSafe = /^(?:https?:|mailto:|[/#.])/i.test(cleaned)
  return isSafe ? cleaned : "#"
}

/**
 * Convert a markdown string to HTML for rendering.
 *
 * @param breaks Convert single line breaks to <br> tags (useful for transcripts)
 */
export function renderMarkdown(md: string, breaks = false): string {
  // First, handle tables before other processing
  // Match table blocks (header row + separator + data rows)
  const tables: string[] = []
  const tableRegex = /^\|(.+)\|\s*\n\|[-:\s|]+\|\s*\n((?:\|.+\|\n)*\|.+\|)/gm
  let result = md.replace(tableRegex, (_match, headerRow, bodyRows) => {
    const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean)
    const rows = bodyRows.trim().split('\n').map((row: string) =>
      row.split('|').map((cell: string) => cell.trim()).filter(Boolean)
    )

    // Tables are lifted out before the escaping pass below and spliced back
    // in afterwards, so their cells have to be escaped here or they bypass
    // escaping entirely.
    const headerHtml = headers.map((h: string) => `<th class="border border-border px-4 py-2 text-left font-semibold bg-muted">${escapeHtml(h)}</th>`).join('')
    const bodyHtml = rows.map((row: string[]) =>
      `<tr>${row.map((cell: string) => `<td class="border border-border px-4 py-2">${escapeHtml(cell)}</td>`).join('')}</tr>`
    ).join('')

    const tableHtml = `<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-border"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`
    tables.push(tableHtml)
    return `__TABLE_PLACEHOLDER_${tables.length - 1}__\n`
  })

  result = escapeHtml(result)
    // Headers with IDs for TOC linking (order matters: most specific first)
    // Note: trim text to match extractHeadings behavior for consistent IDs
    .replace(/^###### (.*$)/gm, (_match, text) => {
      const trimmed = text.trim()
      const id = slugify(trimmed)
      return `<h6 id="${id}" class="text-sm font-semibold mt-4 mb-2 scroll-mt-20">${trimmed}</h6>`
    })
    .replace(/^##### (.*$)/gm, (_match, text) => {
      const trimmed = text.trim()
      const id = slugify(trimmed)
      return `<h5 id="${id}" class="text-base font-semibold mt-4 mb-2 scroll-mt-20">${trimmed}</h5>`
    })
    .replace(/^#### (.*$)/gm, (_match, text) => {
      const trimmed = text.trim()
      const id = slugify(trimmed)
      return `<h4 id="${id}" class="text-lg font-semibold mt-5 mb-2 scroll-mt-20">${trimmed}</h4>`
    })
    .replace(/^### (.*$)/gm, (_match, text) => {
      const trimmed = text.trim()
      const id = slugify(trimmed)
      return `<h3 id="${id}" class="text-xl font-semibold mt-6 mb-3 scroll-mt-20">${trimmed}</h3>`
    })
    .replace(/^## (.*$)/gm, (_match, text) => {
      const trimmed = text.trim()
      const id = slugify(trimmed)
      return `<h2 id="${id}" class="text-2xl font-semibold mt-8 mb-4 scroll-mt-20">${trimmed}</h2>`
    })
    .replace(/^# (.*$)/gm, (_match, text) => {
      const trimmed = text.trim()
      const id = slugify(trimmed)
      return `<h1 id="${id}" class="text-3xl font-bold mt-8 mb-4 scroll-mt-20">${trimmed}</h1>`
    })
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, _lang, code) => {
      return `<pre class="bg-muted text-foreground p-4 rounded-bc-lg overflow-x-auto my-4"><code>${code.trim()}</code></pre>`
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) =>
      `<a href="${safeUrl(url)}" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">${label}</a>`
    )
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) =>
      `<img src="${safeUrl(url)}" alt="${alt}" class="rounded-bc-lg my-4 max-w-full" />`
    )
    // Unordered lists
    .replace(/^\s*[-*]\s+(.*$)/gm, '<li class="ml-4">$1</li>')
    // Ordered lists
    .replace(/^\s*(\d+)\.\s+(.*$)/gm, '<li class="ml-4">$2</li>')
    // Blockquotes
    .replace(/^>\s+(.*$)/gm, '<blockquote class="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-8 border-border" />')
    // Paragraphs (lines not already processed)
    .replace(/^(?!<[h|p|u|o|l|b|c|i|a|hr])(.*$)/gm, (match) => {
      if (match.trim() === "") return ""
      if (match.startsWith("<")) return match
      return `<p class="my-4">${match}</p>`
    })
    // Clean up empty paragraphs
    .replace(/<p class="my-4"><\/p>/g, "")
    // Wrap consecutive list items
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
      return `<ul class="list-disc my-4">${match}</ul>`
    })

  // If breaks enabled, convert remaining newlines to <br> tags
  // (preserves line breaks in transcripts)
  if (breaks) {
    // Collapse multiple newlines to single
    result = result.replace(/\n{2,}/g, '\n')
    // Convert remaining newlines to <br>
    result = result.replace(/\n/g, '<br />')
  }

  // Restore table placeholders (also handle if wrapped in paragraph)
  tables.forEach((tableHtml, index) => {
    result = result.replace(`<p class="my-4">__TABLE_PLACEHOLDER_${index}__</p>`, tableHtml)
    result = result.replace(`__TABLE_PLACEHOLDER_${index}__`, tableHtml)
  })

  return result
}

/**
 * Flatten a markdown blurb into one line of plain text for a social card or a
 * `<meta name="description">`. Summaries are authored as markdown — headings,
 * bold, links, tables, blank lines — and both surfaces render as a single
 * unstyled run of text, so raw `**` and newlines leak through and long bodies
 * overflow the 1200x630 card. Strips the common inline markers, collapses
 * whitespace, then clamps on a word boundary.
 */
export function toCardText(
  input: string | null | undefined,
  maxLength = 180,
): string | null {
  if (!input) return null
  const flat = input
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links / images -> label
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // heading markers
    .replace(/^\s{0,3}>\s?/gm, "") // blockquote markers
    .replace(/[*_`~|]/g, "") // inline emphasis, code, table pipes
    .replace(/\s+/g, " ")
    .trim()
  if (!flat) return null
  if (flat.length <= maxLength) return flat
  const cut = flat.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:·-]+$/, "")}…`
}
