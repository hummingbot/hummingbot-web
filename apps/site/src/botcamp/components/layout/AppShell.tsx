"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, PanelLeft } from "lucide-react"
import { Sheet, SheetContent } from "@/botcamp/components/ui/sheet"
import { cn } from "@/botcamp/lib/utils"
import type { BreadcrumbCrumb } from "@/botcamp/components/learn/types"
import { READ_ONLY_TITLE, useSession } from "@/botcamp/lib/preview-session-client"

interface SidebarRenderOpts {
  onToggle: () => void
  onNavigate: () => void
}

/**
 * Botcamp's dashboard chrome (AppShell), under this site's SiteHeader. Botcamp
 * slots the sidebar toggle + breadcrumb into its own header (LearnHeader);
 * here the site header stays as it is, so they sit in a slim bar under it,
 * together with the read-only preview notice. The sidebar rail starts below
 * the 4rem site header instead of at the top of the window.
 */
export function AppShell({
  crumbs,
  renderSidebar,
  children,
  hasSidebar = true,
  initialCollapsed = false,
  fullBleed = false,
}: {
  crumbs: BreadcrumbCrumb[]
  renderSidebar: (opts: SidebarRenderOpts) => React.ReactNode
  children: React.ReactNode
  /** When false (e.g. instructors), the header shows but no sidebar/toggle. */
  hasSidebar?: boolean
  /** Start with the xl+ rail collapsed (Botcamp's course overview does). */
  initialCollapsed?: boolean
  /** Render children edge to edge, without the padded max-w-7xl column
   *  (the learn pages lay out their own width, like Botcamp's LearnShell). */
  fullBleed?: boolean
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isDesktop = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches

  const handleHeaderToggle = () => {
    if (isDesktop()) setCollapsed(false)
    else setMobileOpen(true)
  }

  if (!hasSidebar) {
    return (
      <div className="min-h-screen">
        <CrumbBar crumbs={crumbs} onToggleSidebar={() => {}} sidebarVisibleOnDesktop />
        <main>
          <div className="max-w-7xl p-6 lg:p-8">{children}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Persistent sidebar (xl+), below the site header. */}
      <aside
        className={cn(
          "hidden xl:flex fixed top-16 bottom-0 left-0 z-30 w-[18rem] overflow-y-auto border-r border-border bg-background/95 backdrop-blur-xs",
          collapsed && "xl:hidden",
        )}
      >
        {renderSidebar({ onToggle: () => setCollapsed(true), onNavigate: () => {} })}
      </aside>

      {/* Mobile / tablet drawer. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" hideClose className="w-[18rem] sm:max-w-[18rem] p-0 overflow-y-auto">
          {renderSidebar({ onToggle: () => setMobileOpen(false), onNavigate: () => setMobileOpen(false) })}
        </SheetContent>
      </Sheet>

      {/* Main column — shifted right of the rail at xl+ unless collapsed. */}
      <div className={cn("xl:pl-[18rem]", collapsed && "xl:pl-0")}>
        <CrumbBar
          crumbs={crumbs}
          onToggleSidebar={handleHeaderToggle}
          sidebarVisibleOnDesktop={!collapsed}
        />
        <main>
          {fullBleed ? children : <div className="max-w-7xl p-6 lg:p-8">{children}</div>}
        </main>
      </div>
    </div>
  )
}

/** Sidebar toggle + breadcrumb (Botcamp's LearnHeader left slot) and the preview notice. */
function CrumbBar({
  crumbs,
  onToggleSidebar,
  sidebarVisibleOnDesktop,
}: {
  crumbs: BreadcrumbCrumb[]
  onToggleSidebar: () => void
  sidebarVisibleOnDesktop: boolean
}) {
  const { data: session } = useSession()
  const viewer = session?.user.name || session?.user.email
  return (
    <div className="flex h-12 items-center gap-3 border-b border-border/50 px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-x-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open sidebar"
          className={cn(
            "-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-bc-md hover:bg-card transition-colors text-foreground shrink-0",
            sidebarVisibleOnDesktop && "xl:hidden",
          )}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <Crumbs crumbs={crumbs} />
      </div>
      {/* Only on the preview's pages; the public cohort overview has no viewer. */}
      {session && (
      <p
        className="ml-auto flex min-w-0 items-center gap-1.5 truncate rounded-full border border-border bg-card/60 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground"
        title={`${READ_ONLY_TITLE}: nothing here can be saved or changed`}
      >
        <Eye className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {READ_ONLY_TITLE}
          {viewer && <span className="max-sm:hidden"> · viewing as {viewer}</span>}
        </span>
      </p>
      )}
    </div>
  )
}

function Crumbs({ crumbs }: { crumbs: BreadcrumbCrumb[] }) {
  return (
    <nav className="flex items-center gap-x-2 text-sm min-w-0">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        // Middle crumb hides on small screens to keep the chain readable.
        const hideOnSmall = !isLast && i > 0 && crumbs.length >= 3
        return (
          <div
            key={`${crumb.label}-${i}`}
            className={cn(
              "flex items-center gap-x-2 min-w-0",
              hideOnSmall && "max-md:hidden",
            )}
          >
            {i > 0 && (
              <span className="text-foreground/25 select-none">/</span>
            )}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="truncate text-foreground hover:text-primary transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "truncate",
                  isLast ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {crumb.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
