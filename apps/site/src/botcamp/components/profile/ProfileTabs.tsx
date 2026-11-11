"use client"

import type { ComponentProps } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import { ProfileEditor } from "@/botcamp/components/profile/ProfileEditor"
import { NotificationPreferences } from "@/botcamp/components/dashboard/NotificationPreferences"
import { StrategySubscriptionCard, type StrategySubscriptionGrant } from "@/botcamp/components/profile/StrategySubscriptionCard"
import { CondorConnectionCard, type Connection } from "@/botcamp/components/profile/CondorConnectionCard"

const TABS = ["profile", "notifications", "billing", "condor"] as const

type ProfileTabsProps = {
  user: ComponentProps<typeof ProfileEditor>["user"]
  canEditVisibility: ComponentProps<typeof ProfileEditor>["canEditVisibility"]
  notificationPrefs: ComponentProps<typeof NotificationPreferences>["initial"]
  strategyGrant: StrategySubscriptionGrant | null
  /** Read-only preview: Condor connections, read on the server. */
  condorConnections: Connection[]
  /** ?tab= on the page URL, so links can open a tab (Condor's errors link to "condor"). */
  initialTab?: string
}

export function ProfileTabs({
  user,
  canEditVisibility,
  notificationPrefs,
  strategyGrant,
  condorConnections,
  initialTab,
}: ProfileTabsProps) {
  const defaultTab = TABS.find((t) => t === initialTab) ?? "profile"
  return (
    <Tabs defaultValue={defaultTab} className="space-y-bc-6">
      <TabsList className="h-10">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="condor">Condor</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-0">
        <ProfileEditor user={user} canEditVisibility={canEditVisibility} />
      </TabsContent>

      <TabsContent value="notifications" className="mt-0">
        <NotificationPreferences initial={notificationPrefs} />
      </TabsContent>

      <TabsContent value="billing" className="mt-0">
        <StrategySubscriptionCard grant={strategyGrant} />
      </TabsContent>

      <TabsContent value="condor" className="mt-0">
        <CondorConnectionCard initialConnections={condorConnections} />
      </TabsContent>
    </Tabs>
  )
}
