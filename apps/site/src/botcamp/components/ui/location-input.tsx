"use client"

import { useState } from "react"
import { MapPin, Loader2 } from "lucide-react"
import { Input } from "@/botcamp/components/ui/input"
import { Button } from "@/botcamp/components/ui/button"
import { detectBrowserLocation } from "@/botcamp/lib/geolocation"

/**
 * Location text field with a "use my location" button that fills it from
 * the browser's geolocation (reverse-geocoded to "City, Country").
 */
export function LocationInput({
  value,
  onChange,
  disabled,
  id,
  placeholder = "e.g. Lisbon, Portugal",
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  placeholder?: string
}) {
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detect = async () => {
    setError(null)
    setDetecting(true)
    try {
      onChange(await detectBrowserLocation())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't detect location")
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="space-y-bc-1.5">
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || detecting}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={detect}
          disabled={disabled || detecting}
          title="Use my location"
          aria-label="Use my location"
          className="shrink-0"
        >
          {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
