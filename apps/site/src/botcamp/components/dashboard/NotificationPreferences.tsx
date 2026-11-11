"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { Switch } from "@/botcamp/components/ui/switch"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

type Prefs = {
  emailMarketing: boolean
  emailCourseUpdates: boolean
  emailStrategyUpdates: boolean
  emailHackathonUpdates: boolean
  newsletterSubscribed: boolean
}

const TOGGLES: { key: keyof Prefs; title: string; description: string }[] = [
  {
    key: "emailStrategyUpdates",
    title: "Strategy updates",
    description:
      "Status changes on your strategies (submitted, changes requested, approved, certified) and new comments.",
  },
  {
    key: "emailHackathonUpdates",
    title: "Hackathon updates",
    description:
      "Status changes on your hackathon applications and team activity.",
  },
  {
    key: "emailCourseUpdates",
    title: "Course updates",
    description:
      "New lessons or updates to courses you're enrolled in, new course bundle offers, and reminders to pick a course back up if you've gone quiet.",
  },
  {
    key: "emailMarketing",
    title: "Announcements & marketing",
    description:
      "Product news, cohort launches, and other announcements from the Botcamp team.",
  },
]

const ALWAYS_ON = [
  "Sign-in codes and account security",
  "Purchase and enrollment receipts",
]

export function NotificationPreferences({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initial)
  const [saving, setSaving] = useState<keyof Prefs | null>(null)
  void saving // read-only preview: the switches are always disabled

  async function update(key: keyof Prefs, value: boolean) {
    const previous = prefs[key]
    setPrefs((p) => ({ ...p, [key]: value })) // optimistic
    setSaving(key)
    try {
      const res = await fetch("/api/users/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      toast.success("Notification preferences saved")
    } catch (err) {
      setPrefs((p) => ({ ...p, [key]: previous })) // revert
      toast.error("Couldn't save your preference. Please try again.")
      console.error("Failed to update notification preference:", err)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-bc-4">
      <div className="space-y-bc-1">
        <h2 className="text-lg font-semibold tracking-bc-tight">
          Email Notifications
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose which emails Botcamp sends you. Account and purchase receipts
          are always sent.
        </p>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {TOGGLES.map((t) => (
            <div
              key={t.key}
              className="flex items-start justify-between gap-4 p-5"
            >
              <div className="space-y-bc-1">
                <p className="font-medium leading-none">{t.title}</p>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
              <ReadOnlyHint><Switch
                checked={prefs[t.key]}
                onCheckedChange={(v) => update(t.key, v)}
                aria-label={t.title}
                disabled /></ReadOnlyHint>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Newsletter
        </p>
        <Card>
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="space-y-bc-1">
                <p className="font-medium leading-none">Hummingbot newsletter</p>
                <p className="text-sm text-muted-foreground">
                  Release notes and podcast recaps via our Hummingbot Substack.
                  Opt in here and we&apos;ll add you to the list.
                </p>
              </div>
              <ReadOnlyHint><Switch
                checked={prefs.newsletterSubscribed}
                onCheckedChange={(v) => update("newsletterSubscribed", v)}
                aria-label="Hummingbot newsletter"
                disabled /></ReadOnlyHint>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Always sent
        </p>
        <Card>
          <CardContent className="divide-y p-0">
            {ALWAYS_ON.map((label) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 p-5"
              >
                <p className="text-sm">{label}</p>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Required
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
