"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CarouselCourse = { slug: string; title: string; level: string; thumbnail: string | null; free: boolean };

const LEVEL: Record<string, string> = { BASIC: "Basic", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };

/**
 * Course covers in a horizontal scroll-snap row, on the Botcamp band. The row runs out to the right edge of the viewport.
 */
export function CourseCarousel({ courses, href }: { courses: CarouselCourse[]; href: string }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {courses.length} courses, included with every cohort
        </p>
        <div className="flex gap-2">
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => scroll(dir)}
              aria-label={dir < 0 ? "Previous courses" : "Next courses"}
              className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {dir < 0 ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={track}
        className="-ml-4 mr-[calc(50%-50vw)] flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-pl-4 pb-2 pl-4 pr-6 [scrollbar-width:none] md:-ml-6 md:scroll-pl-6 md:pl-6 [&::-webkit-scrollbar]:hidden"
      >
        {courses.map((c, i) => (
          <Link
            key={c.slug}
            href={href}
            className="group w-[78%] shrink-0 snap-start sm:w-[22rem] lg:w-[26rem]"
          >
            <div className="relative aspect-video overflow-hidden rounded-xl hub-card border border-border bg-muted">
              {c.thumbnail && (
                <Image
                  src={c.thumbnail}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 78vw, 26rem"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              )}
            </div>
            <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Course {i + 1} · {LEVEL[c.level] ?? c.level}
              {c.free && " · Free"}
            </p>
            <h3 className="mt-1.5 text-lg font-semibold leading-snug transition-colors group-hover:text-muted-foreground">
              {c.title}
            </h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
