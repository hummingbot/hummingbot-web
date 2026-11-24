"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@hummingbot/ui";
import type { DocNavNode } from "@/lib/docs";
import { DocsSidebar } from "./docs-sidebar";

/** Below lg the outline folds into a disclosure above the article. */
export function DocsMobileNav({ nodes, sectionTitle }: { nodes: DocNavNode[]; sectionTitle: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-8 rounded-2xl border border-border bg-card lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span>
          <span className="text-muted-foreground">Menu · </span>
          {sectionTitle}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="max-h-[60vh] overflow-y-auto border-t border-border px-4 py-5">
          <DocsSidebar nodes={nodes} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
