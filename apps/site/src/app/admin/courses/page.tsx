import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { calculateTotalLessons } from "@/botcamp/lib/calculations"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { CoursesTable } from "@/botcamp/components/admin/CoursesTable"
import { Plus } from "lucide-react"

export const metadata = {
  title: "Courses - Admin - Botcamp",
}

async function getCourses(userId: string, role: string) {
  // Instructors can only see their own courses
  const whereClause = role === "INSTRUCTOR"
    ? { instructorId: userId }
    : {}

  const courses = await prisma.course.findMany({
    where: whereClause,
    orderBy: { sortOrder: "asc" },
    include: {
      sections: {
        select: {
          lessons: {
            select: { id: true },
          },
        },
      },
      instructor: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  })

  return courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    level: course.level,
    price: course.price,
    published: course.published,
    lessonCount: calculateTotalLessons(course.sections),
    instructor: course.instructor,
    _count: course._count,
  }))
}

export default async function AdminCoursesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/signin")
  }

  const role = session.user.role
  const userId = session.user.id

  // Only ADMIN and INSTRUCTOR can access
  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    redirect("/dashboard")
  }

  const isAdmin = role === "ADMIN"
  const courses = await getCourses(userId, role)

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Courses"
        description={isAdmin ? "Manage platform courses" : "Manage your courses"}
        variant="admin"
        actions={
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <CoursesTable courses={courses} showInstructor={isAdmin} />
        </CardContent>
      </Card>
    </div>
  )
}
