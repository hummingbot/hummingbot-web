import { PreviewChrome } from "@/botcamp/components/layout/PreviewChrome"

// Botcamp's course (overview + learn) pages, ported as a READ-ONLY local preview (see
// PreviewChrome): a 404 in production or without DASHBOARD_PREVIEW_USER.

export const dynamic = "force-dynamic"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PreviewChrome>{children}</PreviewChrome>
}
