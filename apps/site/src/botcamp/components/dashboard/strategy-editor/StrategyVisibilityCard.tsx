"use client"

import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import { Save, Loader2 } from "lucide-react"
import type { Visibility } from "@/botcamp/types"

interface StrategyVisibilityCardProps {
  visibility: Visibility
  isLoading: boolean
  onVisibilityChange: (value: Visibility) => void
  onSave: () => void
}

export function StrategyVisibilityCard({
  visibility,
  isLoading,
  onVisibilityChange,
  onSave,
}: StrategyVisibilityCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-bc-3">
        <Select
          value={visibility}
          onValueChange={(value) => onVisibilityChange(value as Visibility)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="PRIVATE">Private</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onSave} disabled={isLoading} className="w-full">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Visibility
        </Button>
      </CardContent>
    </Card>
  )
}
