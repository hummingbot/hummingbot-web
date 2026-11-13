declare global {
  interface Window {
    gtag: (command: string, id: string, config: Record<string, unknown>) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID!

type GTagEvent = {
  action: string
  category: string
  label: string
}

export const pageview = (url: string) => {
  if (typeof window.gtag !== 'function') return
  window.gtag('config', GA_ID, {
    page_path: url,
  })
}

export const event = ({ action, category, label }: GTagEvent) => {
  // No Google Analytics on this site; Botcamp's events become no-ops.
  if (typeof window.gtag !== 'function') return
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
  })
}