import { notFound, redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { readAgentZip, type AgentManifest, type AgentPackageIssue } from "@/botcamp/lib/agent-package"
import type { AgentReviewRecord } from "@/botcamp/lib/agent-review"
import { scanAgentPackage } from "@/botcamp/lib/agent-scan"
import { AgentVersionReviewer } from "@/botcamp/components/admin/AgentVersionReviewer"
import { readPageSuggestions } from "@/botcamp/lib/agent-page-suggestions"
import { requireAdmin } from "@/botcamp/lib/api-utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Agent Review - Admin - Botcamp",
}

interface PageProps {
  params: Promise<{ id: string }>
}

// Files are shown from the stored snapshot — exactly what the AI reviewed
// and what Condor would clone — never re-fetched from the source.
export default async function AdminAgentVersionPage({ params }: PageProps) {
  // Admins only: the admin layout also lets instructors in
  if (!(await requireAdmin())) redirect("/admin/courses")
  const { id } = await params
  const version = await prisma.agentVersion.findUnique({
    where: { id },
    include: {
      strategy: { select: { id: true, title: true, slug: true, summary: true, details: true, pageSuggestions: true } },
      uploadedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  if (!version) notFound()

  const reviewer = version.reviewedById
    ? await prisma.user.findUnique({
        where: { id: version.reviewedById },
        select: { firstName: true, lastName: true, email: true },
      })
    : null
  const nameOf = (u: { firstName: string | null; lastName: string | null; email: string | null } | null) =>
    u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—" : null

  const packageFiles = await readAgentZip(Buffer.from(version.archive))
  const scan = scanAgentPackage(packageFiles)
  const files = packageFiles.map((f) => ({
    path: f.path,
    size: f.content.length,
    content: f.content.toString("utf8"),
  }))

  return (
    <AgentVersionReviewer
      version={{
        id: version.id,
        version: version.version,
        status: version.status,
        source: version.source,
        sourceUrl: version.sourceUrl,
        sourceRef: version.sourceRef,
        sha256: version.sha256,
        createdAt: version.createdAt.toISOString(),
        reviewedAt: version.reviewedAt?.toISOString() ?? null,
        reviewNote: version.reviewNote,
        reviewer: nameOf(reviewer),
        uploader: nameOf(version.uploadedBy)!,
        manifest: version.manifest as unknown as AgentManifest,
        warnings: version.warnings as unknown as AgentPackageIssue[],
        aiReview: version.aiReview as AgentReviewRecord | null,
        strategy: { id: version.strategy.id, title: version.strategy.title, slug: version.strategy.slug },
      }}
      files={files}
      scan={scan}
      page={{
        current: {
          title: version.strategy.title,
          summary: version.strategy.summary,
          details: version.strategy.details,
        },
        pending: readPageSuggestions(version.strategy.pageSuggestions),
      }}
    />
  )
}
