"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/botcamp/components/ui/alert-dialog"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface DeleteStrategyButtonProps {
  strategyId: number
  title: string
}

export function DeleteStrategyButton({ strategyId, title }: DeleteStrategyButtonProps): React.JSX.Element {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (event: React.MouseEvent) => {
    // Keep the dialog open until the request settles, so errors show in it.
    event.preventDefault()
    setIsDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/user/strategies/${strategyId}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete strategy")
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isDeleting) return
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <ReadOnlyHint>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="w-24 text-destructive hover:text-destructive"
          disabled
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </AlertDialogTrigger>
      </ReadOnlyHint>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{title}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the strategy and its files. You can&apos;t undo it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
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
              "Delete Strategy"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
