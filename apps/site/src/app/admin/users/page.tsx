import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/botcamp/lib/api-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { UsersTable } from "@/botcamp/components/admin/UsersTable"
import { Plus } from "lucide-react"

export const metadata = {
  title: "Users - Admin - Botcamp",
}

async function getUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      certified: true,
      profileVisibility: true,
      createdAt: true,
      enrollments: {
        where: {
          cohortId: { not: null },
        },
        select: {
          cohort: {
            select: {
              number: true,
            },
          },
        },
      },
      hackathonEntries: {
        select: {
          hackathon: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
          strategies: true,
        },
      },
    },
  })

  // Serialize dates for client component and extract cohort numbers
  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    cohorts: user.enrollments.map((e) => e.cohort!.number).sort((a, b) => a - b),
    hackathons: user.hackathonEntries.map((e) => e.hackathon.slug),
    enrollments: undefined, // Remove the enrollments array after extracting cohort numbers
    hackathonEntries: undefined, // Remove after extracting
  }))
}

async function getHackathons() {
  return prisma.hackathon.findMany({
    where: { status: { not: "DRAFT" } },
    select: { slug: true, title: true },
    orderBy: { startDate: "desc" },
  })
}

export default async function AdminUsersPage() {
  // The admin layout also admits INSTRUCTORs (for their courses); this page
  // holds admin-only data, so send anyone else back to their courses.
  if (!(await requireAdmin())) redirect("/admin/courses")

  const [users, hackathons] = await Promise.all([getUsers(), getHackathons()])

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Users"
        description="Manage platform users"
        variant="admin"
        actions={
          <Button asChild>
            <Link href="/admin/users/new">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} hackathons={hackathons} />
        </CardContent>
      </Card>
    </div>
  )
}
