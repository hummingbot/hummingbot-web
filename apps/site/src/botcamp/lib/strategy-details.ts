// Strategy `details` markdown is edited as fixed `## Section` blocks and
// rebuilt on every change, so the parser must place every line somewhere.

export interface StrategyDetailsSections {
  description: string
  markets: string
  parameters: string
  status: string
  events: string
}

// Parse markdown into sections
export function parseDetailsToSections(markdown: string): StrategyDetailsSections {
  const sections: StrategyDetailsSections = {
    description: "",
    markets: "",
    parameters: "",
    status: "",
    events: "",
  }

  if (!markdown) return sections

  // Split by ## headers
  const sectionRegex = /^## (Description|Markets|Parameters|Status|Events)\s*$/gim
  const parts = markdown.split(sectionRegex)

  // parts array will be: [text before first header, header1, content1, header2, content2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i]?.toLowerCase() as keyof StrategyDetailsSections
    const content = parts[i + 1]?.trim() || ""
    if (header && header in sections) {
      sections[header] = content
    }
  }

  // Text before the first known header has no section of its own — keep it at
  // the top of Description so saving never drops it.
  const preamble = parts[0]?.trim() ?? ""
  if (parts.length > 1 && preamble) {
    sections.description = sections.description ? `${preamble}\n\n${sections.description}` : preamble
  }

  // If no sections were found, treat entire content as description
  if (!sections.description && !sections.markets && !sections.parameters && !sections.status && !sections.events) {
    sections.description = markdown.trim()
  }

  return sections
}

// Combine sections into markdown
export function combineSectionsToDetails(sections: StrategyDetailsSections): string {
  const parts: string[] = []

  if (sections.description.trim()) {
    parts.push(`## Description\n\n${sections.description.trim()}`)
  }
  if (sections.markets.trim()) {
    parts.push(`## Markets\n\n${sections.markets.trim()}`)
  }
  if (sections.parameters.trim()) {
    parts.push(`## Parameters\n\n${sections.parameters.trim()}`)
  }
  if (sections.status.trim()) {
    parts.push(`## Status\n\n${sections.status.trim()}`)
  }
  if (sections.events.trim()) {
    parts.push(`## Events\n\n${sections.events.trim()}`)
  }

  return parts.join("\n\n")
}
