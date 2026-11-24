"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Loader2, Save, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/botcamp/components/ui/alert-dialog"

interface TeamAdminSettingsProps {
  team: {
    id: string
    name: string
    slug: string
    sortOrder: number
    websiteUrl: string | null
  }
}

/**
 * The team fields only Botcamp admins may change (see /api/teams/[teamSlug],
 * which leaves them out), plus deleting the team. Everything a team can edit
 * itself lives in the shared Edit Team Info tab.
 */
export function TeamAdminSettings({ team }: TeamAdminSettingsProps) {
  const router = useRouter()
  const [slug, setSlug] = useState(team.slug)
  const [sortOrder, setSortOrder] = useState(team.sortOrder)
  const [websiteUrl, setWebsiteUrl] = useState(team.websiteUrl ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    setSaved(false)
    setError(null)
    try {
      const response = await fetch(`/api/admin/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), sortOrder, websiteUrl: websiteUrl.trim() || null }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save settings")
      }
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/teams/${team.id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete team")
      }
      router.push("/admin/teams")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team")
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-bc-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-bc-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Changing it moves the public team page URL.
              </p>
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="space-y-bc-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {error && <div className="p-3 bg-destructive/10 text-destructive rounded-bc-lg text-sm">{error}</div>}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSaving || !slug.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
            {saved && <span className="text-sm text-muted-foreground">Saved</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Delete this team</p>
              <p className="text-sm text-muted-foreground">
                Once deleted, this team and all its members will be permanently removed. Applications will be
                orphaned.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Team
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {team.name}? This action cannot be undone. All team members will be
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
