import { BotcampChrome } from "@/botcamp/components/layout/BotcampChrome"

// Botcamp's course (overview + learn) pages (see BotcampChrome).

export const dynamic = "force-dynamic"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <BotcampChrome>{children}</BotcampChrome>
}
