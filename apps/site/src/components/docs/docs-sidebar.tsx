"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@hummingbot/ui";
import type { DocNavNode } from "@/lib/docs";

function containsRoute(node: DocNavNode, route: string): boolean {
  return node.href === route || (node.children ?? []).some((c) => containsRoute(c, route));
}

/**
 * Docs outline in the style of Botcamp's LearnSidebar: top-level groups as
 * bold headings, pages as rows on a left rule whose segment turns primary on
 * the current page. Nested groups collapse, opened when they hold the page.
 */
export function DocsSidebar({ nodes, onNavigate }: { nodes: DocNavNode[]; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const pages = nodes.filter((n) => !n.children);
  const groups = nodes.filter((n) => n.children);

  return (
    <nav aria-label="Docs" className="space-y-8 text-sm">
      {pages.length > 0 && (
        <ul className="flex flex-col gap-3 border-l border-border text-muted-foreground">
          {pages.map((n) => (
            <Row key={n.title + n.href} node={n} active={n.href === pathname} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
      {groups.map((group) => (
        <div key={group.title}>
          {group.href ? (
            <Link
              href={group.href}
              onClick={onNavigate}
              className={cn(
                "text-sm font-semibold leading-tight transition-colors hover:text-primary",
                group.href === pathname ? "text-primary" : "text-foreground",
              )}
            >
              {group.title}
            </Link>
          ) : (
            <h3 className="text-sm font-semibold leading-tight text-foreground">{group.title}</h3>
          )}
          <ul className="mt-3 flex flex-col gap-3 border-l border-border text-muted-foreground">
            {group.children!.map((n) =>
              n.children ? (
                <SubGroup key={n.title} node={n} pathname={pathname} onNavigate={onNavigate} />
              ) : (
                <Row key={n.title + n.href} node={n} active={n.href === pathname} onNavigate={onNavigate} />
              ),
            )}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Row({ node, active, onNavigate }: { node: DocNavNode; active: boolean; onNavigate?: () => void }) {
  if (!node.href) return null;
  return (
    <li>
      <Link
        href={node.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        {...(node.external ? { target: "_blank", rel: "noreferrer" } : {})}
        className={cn(
          "-ml-px flex items-center gap-1.5 border-l pl-4 transition-colors",
          active
            ? "border-primary font-medium text-foreground"
            : "border-transparent hover:border-muted-foreground/40 hover:text-foreground",
        )}
      >
        <span className="truncate">{node.title}</span>
        {node.external && <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />}
      </Link>
    </li>
  );
}

function SubGroup({ node, pathname, onNavigate }: { node: DocNavNode; pathname: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(() => containsRoute(node, pathname));
  const active = node.href === pathname;

  return (
    <li>
      <div className="-ml-px flex items-center gap-1 border-l border-transparent pl-4">
        {node.href ? (
          <Link
            href={node.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn("flex-1 truncate transition-colors hover:text-foreground", active && "font-medium text-foreground")}
          >
            {node.title}
          </Link>
        ) : (
          <span className="flex-1 truncate">{node.title}</span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${node.title}`}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-card hover:text-foreground"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <ul className="ml-4 mt-3 flex flex-col gap-3 border-l border-border">
          {node.children!.map((c) =>
            c.children ? (
              <SubGroup key={c.title} node={c} pathname={pathname} onNavigate={onNavigate} />
            ) : (
              <Row key={c.title + c.href} node={c} active={c.href === pathname} onNavigate={onNavigate} />
            ),
          )}
        </ul>
      )}
    </li>
  );
}
