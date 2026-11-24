"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/botcamp/components/ui/tabs"
import { FileUploadManager, FileItem } from "@/botcamp/components/ui/file-upload-manager"
import { ImageGalleryUpload, StrategyImage } from "@/botcamp/components/strategies/ImageGalleryUpload"
import { StrategyPreview } from "@/botcamp/components/strategies/StrategyPreview"
import { StrategyDetailsEditor } from "@/botcamp/components/dashboard/strategy-editor/StrategyDetailsEditor"
import { TagInput } from "@/botcamp/components/ui/tag-input"
import { Switch } from "@/botcamp/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
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
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  MessageSquare,
  Edit,
  Eye,
  FileText,
  Video,
  Tags,
  Users,
  Settings,
  Search,
  Trash2,
  Download,
  Star,
  Unlock,
} from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { alertColors } from "@/botcamp/lib/design-constants"
import type { StrategyStatus, Visibility } from "@/botcamp/types"

interface Author {
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    slug: string | null
  }
}

interface Strategy {
  id: number
  slug: string
  cohortId: string | null
  title: string
  summary: string | null
  details: string | null
  tags: string[]
  exchanges: string[]
  videoURL: string | null
  status: StrategyStatus
  visibility: Visibility
  featured: boolean
  isFree: boolean
  files: FileItem[]
  images: StrategyImage[]
  authors: Author[]
  cohortRelation?: { number: number } | null
}

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

interface Cohort {
  id: string
  number: number
  title: string | null
}

interface StrategyEditorProps {
  strategy: Strategy
  cohorts: Cohort[]
  tagSuggestions?: string[]
  exchangeSuggestions?: string[]
}

export function StrategyEditor({
  strategy,
  cohorts,
  tagSuggestions = [],
  exchangeSuggestions = [],
}: StrategyEditorProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState(strategy.title)
  const [summary, setSummary] = useState(strategy.summary || "")
  const [details, setDetails] = useState(strategy.details || "")
  const [videoURL, setVideoURL] = useState(strategy.videoURL || "")
  const [tags, setTags] = useState<string[]>(strategy.tags)
  const [exchanges, setExchanges] = useState<string[]>(strategy.exchanges)
  const [cohortId, setCohortId] = useState<string | null>(strategy.cohortId)
  const [status, setStatus] = useState<StrategyStatus>(strategy.status)
  const [visibility, setVisibility] = useState<Visibility>(strategy.visibility)
  const [featured, setFeatured] = useState(strategy.featured)
  const [isFree, setIsFree] = useState(strategy.isFree)
  const [files, setFiles] = useState<FileItem[]>(strategy.files)
  const [images, setImages] = useState<StrategyImage[]>(strategy.images)

  // Authors state
  const [authors, setAuthors] = useState<Author[]>(strategy.authors)
  const [userSearch, setUserSearch] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [addingAuthor, setAddingAuthor] = useState(false)
  const [removingAuthor, setRemovingAuthor] = useState<string | null>(null)

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Auto-computed slug from cohort number + sanitized title
  const computedSlug = useMemo(() => {
    const titleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    const cohortNumber = cohortId
      ? cohorts.find((c) => c.id === cohortId)?.number
      : null
    if (!titleSlug) return strategy.slug
    if (cohortNumber === 0) return `example-${titleSlug}`
    return cohortNumber ? `cohort-${cohortNumber}-${titleSlug}` : titleSlug
  }, [title, cohortId, cohorts, strategy.slug])

  const cohortLabel = (n: number | null | undefined) =>
    n === 0 ? "Example" : n != null ? `Cohort ${n}` : null

  // Search users for author selection
  useEffect(() => {
    if (userSearch.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      setLoadingUsers(true)
      fetch(`/api/users?search=${encodeURIComponent(userSearch)}&limit=10`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            // Filter out users who are already authors
            const authorIds = authors.map((a) => a.user.id)
            setSearchResults(data.data.filter((u: User) => !authorIds.includes(u.id)))
          }
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [userSearch, authors])

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/strategies/${strategy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: computedSlug,
          summary: summary || null,
          details: details || null,
          videoURL: videoURL || null,
          tags,
          exchanges,
          cohortId,
          status,
          visibility,
          featured,
          isFree,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save strategy")
      }

      setSuccess("Strategy saved successfully")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAuthor = async (userId: string) => {
    setAddingAuthor(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/strategies/${strategy.id}/authors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add author")
      }

      const { data } = await response.json()
      setAuthors((prev) => [...prev, data])
      setUserSearch("")
      setSearchResults([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add author")
    } finally {
      setAddingAuthor(false)
    }
  }

  const handleRemoveAuthor = async (userId: string) => {
    setRemovingAuthor(userId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/strategies/${strategy.id}/authors/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to remove author")
      }

      setAuthors((prev) => prev.filter((a) => a.user.id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove author")
    } finally {
      setRemovingAuthor(null)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/strategies/${strategy.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete strategy")
      }

      router.push("/admin/strategies")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete strategy")
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // Get author names for preview
  const previewAuthors = authors.map((a) => ({
    id: a.user.id,
    slug: a.user.slug || a.user.id,
    name: [a.user.firstName, a.user.lastName].filter(Boolean).join(" ") || a.user.email,
  }))

  return (
    <div className="space-y-bc-6">
      {/* Header */}
      <div className="space-y-bc-1">
        <Link
          href="/admin/strategies"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground pl-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Strategies
        </Link>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold h-auto py-1 px-2 border-transparent hover:border-border focus:border-primary bg-transparent"
          placeholder="Strategy Title"
        />

        <p className="text-sm text-muted-foreground pl-2">
          {cohortId
            ? cohortLabel(cohorts.find((c) => c.id === cohortId)?.number) || "Cohort ?"
            : "No cohort"} · /{computedSlug}
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className={cn("p-4 text-sm rounded-bc-md", alertColors.error)}>
          {error}
        </div>
      )}
      {success && (
        <div className={cn("p-4 text-sm rounded-bc-md", alertColors.success)}>
          {success}
        </div>
      )}

      {/* Quick Actions for Review Workflow */}
      {status === "SUBMITTED" && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <MessageSquare className="h-5 w-5" />
              Awaiting Review
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              variant="default"
              onClick={() => setStatus("APPROVED")}
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Strategy
            </Button>
            <Button
              variant="outline"
              onClick={() => setStatus("CHANGES_REQUESTED")}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Request Changes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Main Content Area */}
        <div className="min-w-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "edit" | "preview")}
          >
            <TabsList className="mb-4 h-10">
              <TabsTrigger value="edit" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* Edit Tab */}
            <TabsContent value="edit" className="space-y-bc-6 mt-0">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Summary
                  </CardTitle>
                  <CardDescription>
                    A short summary shown on strategy cards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="What does this strategy do in 1-2 sentences?"
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Detailed Description - reuse user editor component */}
              <StrategyDetailsEditor
                details={details}
                onDetailsChange={setDetails}
              />

              {/* Flowchart & Images */}
              <ImageGalleryUpload
                strategySlug={strategy.slug}
                images={images}
                onImagesChange={setImages}
                uploadUrl={`/api/admin/strategies/${strategy.id}/images`}
                title="Flowchart & Images"
              />

              {/* Code Files */}
              <FileUploadManager
                files={files}
                onFilesChange={setFiles}
                uploadUrl="/api/admin/strategy-files"
                downloadUrlPrefix="/api/admin/strategy-files"
                deleteUrlPrefix="/api/admin/strategy-files"
                entityId={strategy.id}
                title="Code Files"
                inputId="admin-file-upload"
                allowLinks={true}
              />

              {/* Video URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Video Link
                  </CardTitle>
                  <CardDescription>
                    YouTube link
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={videoURL}
                    onChange={(e) => setVideoURL(e.target.value)}
                    placeholder="https://..."
                  />
                </CardContent>
              </Card>

              {/* Tags & Exchanges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="h-5 w-5" />
                    Tags & Exchanges
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-bc-4">
                  <div className="space-y-bc-2">
                    <Label>Tags</Label>
                    <TagInput
                      value={tags}
                      onChange={setTags}
                      suggestions={tagSuggestions}
                      placeholder="Select or add tags..."
                    />
                  </div>
                  <div className="space-y-bc-2">
                    <Label>Exchanges</Label>
                    <TagInput
                      value={exchanges}
                      onChange={setExchanges}
                      suggestions={exchangeSuggestions}
                      placeholder="Select or add exchanges..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-0">
              <StrategyPreview
                title={title}
                slug={computedSlug}
                summary={summary}
                details={details}
                tags={tags}
                exchanges={exchanges}
                videoURL={videoURL || null}
                images={images}
                cohortNumber={cohortId ? cohorts.find(c => c.id === cohortId)?.number : undefined}
                files={files}
                authors={previewAuthors}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-bc-4 lg:sticky lg:top-20 lg:mt-14">
          {/* Authors - with management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Authors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-bc-4">
              {/* Current Authors */}
              {authors.length > 0 ? (
                <div className="space-y-bc-2">
                  {authors.map((author) => (
                    <div
                      key={author.user.id}
                      className="flex items-center justify-between p-2 rounded-bc-lg border bg-muted/50"
                    >
                      <div className="text-sm min-w-0">
                        <p className="font-medium truncate">
                          {author.user.firstName} {author.user.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs truncate">
                          {author.user.email}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAuthor(author.user.id)}
                        disabled={removingAuthor === author.user.id}
                        title="Remove author"
                      >
                        {removingAuthor === author.user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No authors assigned</p>
              )}

              {/* Add Author */}
              <div className="space-y-bc-2">
                <Label className="text-xs font-medium">Add Author</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                {loadingUsers && (
                  <p className="text-xs text-muted-foreground">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="border rounded-bc-md max-h-40 overflow-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex justify-between items-center"
                        onClick={() => handleAddAuthor(user.id)}
                        disabled={addingAuthor}
                      >
                        <span className="truncate">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-muted-foreground text-xs ml-2 truncate">
                          {user.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {userSearch.length >= 2 && searchResults.length === 0 && !loadingUsers && (
                  <p className="text-xs text-muted-foreground">No users found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status & Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Status & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-bc-4">
              <div className="space-y-bc-2">
                <Label>Cohort</Label>
                <Select
                  value={cohortId || "none"}
                  onValueChange={(value) => setCohortId(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No cohort assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No cohort</SelectItem>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohortLabel(cohort.number)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-bc-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as StrategyStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="CHANGES_REQUESTED">Changes Requested</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="CERTIFIED">Certified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-bc-2">
                <Label>Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(value) => setVisibility(value as Visibility)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only applies when Certified
                </p>
              </div>
              <div className="space-y-bc-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="featured" className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Featured
                  </Label>
                  <Switch
                    id="featured"
                    checked={featured}
                    onCheckedChange={setFeatured}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leads the Featured sort on /strategies and shows a star badge
                </p>
              </div>
              <div className="space-y-bc-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="isFree" className="flex items-center gap-2">
                    <Unlock className="h-4 w-4 text-amber-500" />
                    Free to View
                  </Label>
                  <Switch
                    id="isFree"
                    checked={isFree}
                    onCheckedChange={setIsFree}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Any signed-in user sees the code and resources without paying.
                  Private still hides them
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>

          {/* Download Button */}
          <Button variant="outline" asChild className="w-full">
            <a href={`/api/admin/strategies/${strategy.id}/download`}>
              <Download className="mr-2 h-4 w-4" />
              Download ZIP
            </a>
          </Button>

          {/* Delete Button */}
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Strategy
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Strategy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{title}&quot;? This action cannot be undone.
              All files, images, and versions associated with this strategy will be permanently deleted.
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
