import { prisma } from "@/botcamp/lib/prisma"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/botcamp/lib/api-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { StrategiesTable } from "@/botcamp/components/admin/StrategiesTable"
import { AdminCreateStrategyButton } from "@/botcamp/components/admin/AdminCreateStrategyButton"

export const metadata = {
  title: "Strategies - Admin - Botcamp",
}

async function getStrategies() {
  const strategies = await prisma.strategy.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      cohortRelation: {
        select: {
          number: true,
        },
      },
      authors: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  })

  // Serialize for client component
  return strategies.map((strategy) => ({
    id: strategy.id,
    slug: strategy.slug,
    title: strategy.title,
    status: strategy.status,
    tags: strategy.tags,
    createdAt: strategy.createdAt.toISOString(),
    cohortNumber: strategy.cohortRelation?.number ?? null,
    authorNames: strategy.authors.map(
      (a) => `${a.user.firstName} ${a.user.lastName}`
    ),
  }))
}

export default async function AdminStrategiesPage() {
  // The admin layout also admits INSTRUCTORs (for their courses); this page
  // holds admin-only data, so send anyone else back to their courses.
  if (!(await requireAdmin())) redirect("/admin/courses")

  const strategies = await getStrategies()

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Strategies"
        description="Manage trading strategies"
        variant="admin"
        actions={<AdminCreateStrategyButton />}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Strategies ({strategies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <StrategiesTable strategies={strategies} />
        </CardContent>
      </Card>
    </div>
  )
}
