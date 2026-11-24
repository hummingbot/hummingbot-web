"use client"

import Link from "next/link"
import { Button } from "@/botcamp/components/ui/button"
import { Save, Loader2, Trash2, ChevronRight } from "lucide-react"
interface BreadcrumbItem {
  label: string
  href?: string
}

interface EditorHeaderProps {
  breadcrumb?: BreadcrumbItem[]
  title: string
  subtitle?: string
  isNew: boolean
  isLoading: boolean
  onSave: () => void
  onDelete?: () => void
  saveLabel?: string
  createLabel?: string
  error?: string | null
}

export function EditorHeader({
  breadcrumb,
  title,
  subtitle,
  isNew,
  isLoading,
  onSave,
  onDelete,
  saveLabel = "Save Changes",
  createLabel = "Create",
  error,
}: EditorHeaderProps) {
  return (
    <>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          {breadcrumb.map((item, index) => (
            <span key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-4 w-4" />}
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <Button variant="destructive" onClick={onDelete} disabled={isLoading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button onClick={onSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isNew ? createLabel : saveLabel}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-bc-lg">
          {error}
        </div>
      )}
    </>
  )
}
