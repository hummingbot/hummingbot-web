import { redirect } from "next/navigation"

// Redirect old settings URL to new profile page
export default function SettingsPage() {
  redirect("/dashboard/profile")
}
