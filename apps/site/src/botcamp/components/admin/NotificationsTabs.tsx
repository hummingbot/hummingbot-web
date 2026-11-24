'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/botcamp/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/botcamp/components/ui/card'
import { Button } from '@/botcamp/components/ui/button'
import { BroadcastComposer } from './BroadcastComposer'
import { BroadcastHistoryTable } from './BroadcastHistoryTable'
import { WelcomeSeriesStats, type WelcomeSeriesStepStat } from './WelcomeSeriesStats'
import { Send, History, ExternalLink, Mail, Download, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Cohort {
  id: string
  number: number
  title: string | null
  _count: {
    enrollments: number
  }
}

interface Hackathon {
  id: string
  slug: string
  title: string
  _count: {
    entries: number
  }
}

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

interface Broadcast {
  id: string
  subject: string
  body: string
  audienceType: string
  cohortNumber: number | null
  hackathonSlug: string | null
  recipientCount: number
  sentAt: Date
  sentBy: {
    firstName: string | null
    lastName: string | null
    email: string
  } | null
  stats?: {
    delivered: number
    opened: number
    clicked: number
    bounced: number
  } | null
}

interface NotificationsTabsProps {
  cohorts: Cohort[]
  hackathons: Hackathon[]
  users: User[]
  totalUsers: number
  totalMembers: number
  totalCourseStudents: number
  totalAdmins: number
  currentUser: { firstName: string | null; lastName: string | null; email: string } | null
  broadcasts: Broadcast[]
  audienceLabels: Record<string, string>
  newsletterCount: number
  welcomeSeriesStats: WelcomeSeriesStepStat[]
}

export function NotificationsTabs({
  cohorts,
  hackathons,
  users,
  totalUsers,
  totalMembers,
  totalCourseStudents,
  totalAdmins,
  currentUser,
  broadcasts,
  audienceLabels,
  newsletterCount,
  welcomeSeriesStats,
}: NotificationsTabsProps) {
  return (
    <Tabs defaultValue="compose" className="space-y-bc-6">
      <TabsList>
        <TabsTrigger value="compose" className="gap-2">
          <Send className="h-4 w-4" />
          Compose
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-2">
          <History className="h-4 w-4" />
          History
        </TabsTrigger>
        <TabsTrigger value="welcome-series" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Welcome Series
        </TabsTrigger>
        <TabsTrigger value="newsletter" className="gap-2">
          <Mail className="h-4 w-4" />
          Newsletter
        </TabsTrigger>
      </TabsList>

      <TabsContent value="compose">
        <BroadcastComposer
          cohorts={cohorts}
          hackathons={hackathons}
          users={users}
          totalUsers={totalUsers}
          totalMembers={totalMembers}
          totalCourseStudents={totalCourseStudents}
          totalAdmins={totalAdmins}
          currentUser={currentUser}
        />
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Broadcast History</CardTitle>
              <CardDescription>
                Recent email broadcasts sent from the admin panel
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="https://resend.com/emails" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Resend Dashboard
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <BroadcastHistoryTable
              broadcasts={broadcasts}
              audienceLabels={audienceLabels}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="welcome-series">
        <WelcomeSeriesStats steps={welcomeSeriesStats} />
      </TabsContent>

      <TabsContent value="newsletter">
        <Card>
          <CardHeader>
            <CardTitle>Hummingbot Newsletter (Substack)</CardTitle>
            <CardDescription>
              {newsletterCount.toLocaleString()} user
              {newsletterCount === 1 ? " has" : "s have"} opted in. Substack
              blocks programmatic subscribes, so export the opted-in list and
              import it in Substack.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-bc-4">
            <Button asChild>
              <a href="/api/admin/newsletter-export" download>
                <Download className="mr-2 h-4 w-4" />
                Export subscribers (CSV)
              </a>
            </Button>
            <ol className="list-decimal space-y-bc-1 pl-5 text-sm text-muted-foreground">
              <li>Download the CSV above.</li>
              <li>
                In Substack: <span className="font-medium">Dashboard → Subscribers → Import</span>,
                then upload the file.
              </li>
              <li>
                Substack only adds new emails, so re-importing later is safe.
              </li>
            </ol>
            <Button variant="outline" size="sm" asChild>
              <Link
                href="https://hummingbot.substack.com/publish/subscribers"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Substack subscribers
              </Link>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
