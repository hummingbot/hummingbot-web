"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { EditorHeader } from "@/botcamp/components/admin/EditorHeader"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Creates a team from just its identity. Everything else — description,
 * logos, brand color, rules, resources, members — is set afterwards on the
 * team's admin page, which is the same view the team's own admins use.
 */
export function NewTeamForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), sortOrder }),
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || "Failed to create team")
      }
      router.push(`/admin/teams/${json.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-bc-6">
      <EditorHeader
        breadcrumb={[{ label: "Teams", href: "/admin/teams" }, { label: "New Team" }]}
        title="Create Team"
        subtitle="Set the rest up on the team's page once it exists."
        isNew
        isLoading={isLoading}
        onSave={handleCreate}
        createLabel="Create Team"
        error={error}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-bc-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slugEdited) setSlug(slugify(e.target.value))
                }}
                placeholder="e.g., Hummingbot"
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugEdited(true)
                }}
                placeholder="e.g., hummingbot"
              />
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
        </CardContent>
      </Card>
    </div>
  )
}
