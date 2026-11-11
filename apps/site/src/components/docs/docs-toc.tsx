"use client";

import { useEffect, useState } from "react";
import { cn } from "@hummingbot/ui";
import type { DocHeading } from "@/lib/docs";

/** "On this page" list with scroll-spy, as in Botcamp's TableOfContents. */
export function DocsToc({ items }: { items: DocHeading[] }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActiveId(entry.target.id);
      },
      { rootMargin: "-80px 0px -80% 0px", threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page" className="space-y-2">
      <h2 className="mb-4 text-sm font-semibold text-foreground">On this page</h2>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "block border-l-2 py-1 pl-3 transition-colors hover:text-foreground",
                item.depth === 3 && "pl-6",
                activeId === item.id
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
