import { redirect } from "next/navigation"

// Botcamp's strategy pages live at /strategies/[slug]; here they're in the
// Hub. Keeps links from Botcamp's emails and copied code working.
export default async function StrategyRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<never> {
  const { slug } = await params
  redirect(`/hub/${encodeURIComponent(slug)}`)
}
