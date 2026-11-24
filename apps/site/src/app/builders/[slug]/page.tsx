import type { Metadata } from "next"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import BuilderProfileClient from "@/botcamp/app/builders/BuilderProfileClient"
import { getBuilderMeta, getBuilderProfile } from "@/botcamp/lib/builders"

// Botcamp's public builder profile (botcamp.xyz/builders/<slug>). Botcamp's
// page fetches /api/members/<slug> in the browser; here the same payload is
// read on the server (getBuilderProfile), PRIVATE profiles included as the
// same name + strategies + cohorts stub.
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const builder = await getBuilderMeta(slug)
  if (!builder) {
    return {
      title: "Builder not found",
      description: "This builder doesn't exist or hasn't joined Botcamp yet.",
    }
  }

  const cohortLabel = builder.cohortNumbers.length
    ? `Cohort ${builder.cohortNumbers.join(", ")}`
    : "Botcamp builder"
  const strategyLabel =
    builder.strategyCount > 0
      ? ` · ${builder.strategyCount} certified ${builder.strategyCount === 1 ? "strategy" : "strategies"}`
      : ""
  const description = `${cohortLabel}${strategyLabel} on Botcamp.`

  return {
    title: builder.name,
    description,
    openGraph: {
      type: "profile",
      title: builder.name,
      description,
      url: `/builders/${builder.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: builder.name,
      description,
    },
  }
}

export default async function BuilderProfilePage({ params }: PageProps) {
  const { slug } = await params
  const member = await getBuilderProfile(slug)
  return <BuilderProfileClient member={member} header={<SiteHeader />} footer={<SiteFooter />} />
}
