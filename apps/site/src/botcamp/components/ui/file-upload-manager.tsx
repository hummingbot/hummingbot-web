"use client"

import { useState, useCallback, ReactNode } from "react"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Badge } from "@/botcamp/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/botcamp/components/ui/dialog"
import { formatFileSize } from "@/botcamp/lib/format"
import { Plus, Trash2, Loader2, FileCode, Download, Lock, Link2, ExternalLink } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { alertColors } from "@/botcamp/lib/design-constants"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

export interface FileItem {
  id: string
  type?: "FILE" | "LINK"
  filename: string
  mimeType?: string | null
  size?: number | null
  url?: string | null
  sortOrder?: number
}

interface FileUploadManagerProps {
  files: FileItem[]
  onFilesChange: (files: FileItem[]) => void
  uploadUrl: string
  downloadUrlPrefix: string
  deleteUrlPrefix: string
  entityId?: string | number
  disabled?: boolean
  title?: ReactNode
  description?: string
  maxFileSize?: number // in bytes
  maxTotalSize?: number // in bytes
  accept?: string
  inputId?: string
  allowLinks?: boolean // Enable adding external links (GitHub repos, etc.)
}

/**
 * Reusable file upload manager component
 *
 * Eliminates duplicate file upload/download/delete logic across editor components
 */
export function FileUploadManager({
  files,
  onFilesChange,
  uploadUrl,
  downloadUrlPrefix,
  deleteUrlPrefix,
  entityId,
  disabled = false,
  title = "Files",
  description,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxTotalSize = 50 * 1024 * 1024, // 50MB default
  accept,
  inputId = "file-upload",
  allowLinks = false,
}: FileUploadManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkName, setLinkName] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [isAddingLink, setIsAddingLink] = useState(false)

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFiles = e.target.files
      if (!uploadedFiles || uploadedFiles.length === 0 || !entityId) return

      setIsUploading(true)
      setError(null)

      try {
        for (const file of Array.from(uploadedFiles)) {
          // Check file size
          if (file.size > maxFileSize) {
            throw new Error(`File "${file.name}" exceeds maximum size of ${formatFileSize(maxFileSize)}`)
          }

          // Check total size
          const currentTotal = files.reduce((sum, f) => sum + (f.size ?? 0), 0)
          if (currentTotal + file.size > maxTotalSize) {
            throw new Error(`Total file size would exceed ${formatFileSize(maxTotalSize)}`)
          }

          const formData = new FormData()
          formData.append("file", file)
          formData.append("strategyId", entityId.toString())
          formData.append("sortOrder", files.length.toString())

          const response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Failed to upload file")
          }

          const newFile = await response.json()
          onFilesChange([...files, newFile])
        }

        // Reset the input
        e.target.value = ""
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsUploading(false)
      }
    },
    [entityId, files, maxFileSize, maxTotalSize, onFilesChange, uploadUrl]
  )

  const handleDownload = useCallback(
    async (fileId: string, filename: string) => {
      try {
        const response = await fetch(`${downloadUrlPrefix}/${fileId}/download`)
        if (!response.ok) throw new Error("Failed to download file")

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to download file")
      }
    },
    [downloadUrlPrefix]
  )

  const handleDelete = useCallback(
    async (fileId: string) => {
      if (!confirm("Are you sure you want to delete this item?")) return

      setIsDeleting(fileId)
      setError(null)

      try {
        const response = await fetch(`${deleteUrlPrefix}/${fileId}`, {
          method: "DELETE",
        })

        if (!response.ok) throw new Error("Failed to delete item")

        onFilesChange(files.filter((f) => f.id !== fileId))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete item")
      } finally {
        setIsDeleting(null)
      }
    },
    [deleteUrlPrefix, files, onFilesChange]
  )

  const handleAddLink = useCallback(async () => {
    if (!linkName.trim() || !linkUrl.trim() || !entityId) return

    // Validate URL
    try {
      new URL(linkUrl)
    } catch {
      setError("Please enter a valid URL")
      return
    }

    setIsAddingLink(true)
    setError(null)

    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: entityId.toString(),
          filename: linkName.trim(),
          url: linkUrl.trim(),
          sortOrder: files.length,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add link")
      }

      const newLink = await response.json()
      onFilesChange([...files, newLink])

      // Reset and close dialog
      setLinkName("")
      setLinkUrl("")
      setLinkDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add link")
    } finally {
      setIsAddingLink(false)
    }
  }, [entityId, files, linkName, linkUrl, onFilesChange, uploadUrl])

  return (
    <>
    {/* Link Dialog */}
    <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add External Link</DialogTitle>
          <DialogDescription>
            Add a link to an external resource like a GitHub repository.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="link-name">Display Name</Label>
            <Input
              id="link-name"
              placeholder="e.g., GitHub Repository"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://github.com/..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setLinkDialogOpen(false)}
            disabled={isAddingLink}
          >
            Cancel
          </Button>
          <ReadOnlyHint><Button
            onClick={handleAddLink}
            disabled>
            {isAddingLink ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            Add Link
          </Button></ReadOnlyHint>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Main Card */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          {title} ({files.length})
          {disabled && <Lock className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {error && (
          <div className={cn("p-3 text-sm rounded-bc-md", alertColors.error)}>
            {error}
          </div>
        )}

        {files.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {disabled
              ? "No files attached."
              : entityId
              ? 'No files yet. Click "Upload Files" below to add files.'
              : "Save first before adding files."}
          </p>
        )}

        {files.map((file) => (
          <div
            key={file.id}
            className="border rounded-bc-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {file.type === "LINK" ? (
                <ExternalLink className="h-5 w-5 text-primary" />
              ) : (
                <FileCode className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <span className="font-medium">{file.filename}</span>
                {file.type === "LINK" ? (
                  <p className="text-xs text-muted-foreground truncate max-w-xs">
                    {file.url}
                  </p>
                ) : (
                  <div className="flex gap-2 mt-1">
                    {file.size != null && (
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(file.size)}
                      </Badge>
                    )}
                    {file.mimeType && (
                      <Badge variant="secondary" className="text-xs">
                        {file.mimeType}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {file.type === "LINK" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a href={file.url || "#"} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open
                  </a>
                </Button>
              ) : (
                <ReadOnlyHint><Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file.id, file.filename)}
                  disabled>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button></ReadOnlyHint>
              )}
              {!disabled && (
                <ReadOnlyHint><Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(file.id)}
                  disabled>
                  {isDeleting === file.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button></ReadOnlyHint>
              )}
            </div>
          </div>
        ))}

        {!disabled && entityId && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex gap-2">
              <Input
                type="file"
                multiple
                onChange={handleUpload}
                disabled
                className="hidden"
                id={inputId}
                accept={accept}
              />
              <ReadOnlyHint><Button size="sm" asChild disabled>
                <label htmlFor={inputId} className="pointer-events-none opacity-50">
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Upload Files
                </label>
              </Button></ReadOnlyHint>
              {allowLinks && (
                <ReadOnlyHint><Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLinkDialogOpen(true)}
                  disabled>
                  <Link2 className="mr-2 h-4 w-4" />
                  Add Link
                </Button></ReadOnlyHint>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Max file size: {formatFileSize(maxFileSize)}. Max total: {formatFileSize(maxTotalSize)}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  )
}
