'use client'

/* eslint-disable @next/next/no-img-element -- as in Botcamp: images from its API */

import { useState } from 'react'

interface StrategyImage {
  id: string
  filename: string
  mimeType: string
  size: number
  sortOrder: number
}

interface StrategyImageGalleryProps {
  images: StrategyImage[]
  strategySlug: string
  title?: string
}

export function StrategyImageGallery({
  images,
  strategySlug,
  title = "Flowchart & Images",
}: StrategyImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (images.length === 0) return null

  const selectedImage = images[selectedIndex]
  const getImageUrl = (imageId: string) => `/api/strategies/${strategySlug}/images/${imageId}`

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>

      {/* Main Image */}
      <div className="border rounded-bc-lg overflow-hidden bg-muted/30 mb-3">
        <img
          src={getImageUrl(selectedImage.id)}
          alt={selectedImage.filename}
          className="w-full h-auto max-h-[500px] object-contain"
        />
      </div>

      {/* Thumbnails - only show if more than 1 image */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              className={`shrink-0 w-20 h-20 rounded-bc-md overflow-hidden border-2 transition-all ${
                index === selectedIndex
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <img
                src={getImageUrl(image.id)}
                alt={image.filename}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
