'use client'

/* eslint-disable @next/next/no-img-element -- as in Botcamp: images from its API */

import { useState, useCallback, useEffect, ReactNode } from 'react'
import { Button } from '@/botcamp/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/botcamp/components/ui/card'
import { Input } from '@/botcamp/components/ui/input'
import { ImageIcon, Upload, Trash2, Loader2, Lock, X } from 'lucide-react'
import { cn } from '@/botcamp/lib/utils'
import { alertColors } from '@/botcamp/lib/design-constants'
import { formatFileSize } from '@/botcamp/lib/format'
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

export interface StrategyImage {
  id: string
  filename: string
  mimeType: string
  size: number
  sortOrder: number
}

interface ImageGalleryUploadProps {
  strategySlug: string
  images: StrategyImage[]
  onImagesChange: (images: StrategyImage[]) => void
  disabled?: boolean
  uploadUrl: string // e.g., "/api/user/strategies/123/images"
  title?: string
  description?: ReactNode
}

export function ImageGalleryUpload({
  strategySlug,
  images,
  onImagesChange,
  disabled = false,
  uploadUrl,
  title = "Flowchart & Images",
  description,
}: ImageGalleryUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  // Cache buster for image URLs
  const [cacheBuster, setCacheBuster] = useState<number | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setCacheBuster(Date.now())
  }, [])

  const getImageUrl = (imageId: string) => {
    const base = `/api/strategies/${strategySlug}/images/${imageId}`
    return cacheBuster ? `${base}?t=${cacheBuster}` : base
  }

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setError(null)

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`${file.name}: Only PNG, JPEG, WebP, or SVG images are allowed`)
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
          throw new Error(`${file.name}: Image must be less than 2MB`)
        }

        // Show preview while uploading
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviewFile({ url: e.target?.result as string, name: file.name })
        }
        reader.readAsDataURL(file)

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to upload image')
        }

        const newImage = await response.json()
        onImagesChange([...images, newImage])

        // Clear preview
        setPreviewFile(null)
      }

      // Bust cache for new images
      setCacheBuster(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
      setPreviewFile(null)
    } finally {
      setIsUploading(false)
      // Reset the input
      e.target.value = ''
    }
  }, [uploadUrl, images, onImagesChange])

  const handleDelete = useCallback(async (imageId: string) => {
    if (!confirm('Are you sure you want to remove this image?')) return

    setDeletingId(imageId)
    setError(null)

    try {
      const response = await fetch(`${uploadUrl}/${imageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete image')
      }

      onImagesChange(images.filter(img => img.id !== imageId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image')
    } finally {
      setDeletingId(null)
    }
  }, [uploadUrl, images, onImagesChange])

  const defaultDescription = disabled
    ? 'Images cannot be modified after certification'
    : 'Upload flowcharts and diagrams to visualize your strategy (PNG, JPEG, WebP, or SVG, max 2MB each)'

  return (
    <>
      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Button
              variant="outline"
              size="icon"
              className="absolute -top-12 right-0"
              onClick={() => setExpandedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-[85vh] object-contain rounded-bc-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {title}
            {disabled && <Lock className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
          <CardDescription>
            {description || defaultDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          {error && (
            <div className={cn("p-3 text-sm rounded-bc-md", alertColors.error)}>
              {error}
            </div>
          )}

          {/* Image Grid */}
          {(images.length > 0 || previewFile) && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group border rounded-bc-lg overflow-hidden bg-muted/30"
                >
                  <img
                    src={getImageUrl(image.id)}
                    alt={image.filename}
                    className="w-full h-32 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setExpandedImage(getImageUrl(image.id))}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xs p-2">
                    <p className="text-xs truncate" title={image.filename}>
                      {image.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(image.size)}
                    </p>
                  </div>
                  {!disabled && (
                    <ReadOnlyHint><Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(image.id)}
                      disabled>
                      {deletingId === image.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button></ReadOnlyHint>
                  )}
                </div>
              ))}

              {/* Preview of uploading image */}
              {previewFile && (
                <div className="relative border rounded-bc-lg overflow-hidden bg-muted/30">
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="w-full h-32 object-contain opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xs p-2">
                    <p className="text-xs truncate">{previewFile.name}</p>
                    <p className="text-xs text-muted-foreground">Uploading...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload area when no images */}
          {images.length === 0 && !previewFile && !disabled && (
            <div className="border-2 border-dashed rounded-bc-lg p-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload flowcharts and images to visualize your strategy
              </p>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                multiple
                onChange={handleUpload}
                disabled
                className="hidden"
                id="image-gallery-upload"
              />
              <ReadOnlyHint><Button asChild disabled>
                <label htmlFor="image-gallery-upload" className="pointer-events-none opacity-50">
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload Images
                </label>
              </Button></ReadOnlyHint>
            </div>
          )}

          {/* Upload button when images exist */}
          {images.length > 0 && !disabled && (
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                multiple
                onChange={handleUpload}
                disabled
                className="hidden"
                id="image-gallery-upload-more"
              />
              <ReadOnlyHint><Button variant="outline" asChild disabled>
                <label htmlFor="image-gallery-upload-more" className="pointer-events-none opacity-50">
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Add More Images
                </label>
              </Button></ReadOnlyHint>
            </div>
          )}

          {/* Disabled state message */}
          {disabled && images.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No images uploaded.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
