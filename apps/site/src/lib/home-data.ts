/**
 * Home page figures from Botcamp's database (read-only; see src/botcamp/lib/
 * prisma.ts). The same rules as the Botcamp page, so the numbers on the
 * home always match what that page lists.
 */
import { prisma } from "@/botcamp/lib/prisma";

export type BotcampIntro = {
  /** The cohort being enrolled now, or the one after the latest. */
  nextCohort: { number: number; status: "upcoming" | "active" | "next"; startDate: string | null };
  courses: { slug: string; title: string; level: string; thumbnail: string | null; free: boolean }[];
  stats: { cohorts: number; members: number; certified: number };
};

export async function getBotcampIntro(): Promise<BotcampIntro> {
  const [cohorts, courses, completed, members, certified] = await Promise.all([
    prisma.cohort.findMany({
      where: { number: { gt: 0 } },
      orderBy: { number: "desc" },
      select: { number: true, status: true, startDate: true },
    }),
    prisma.course.findMany({
      where: { published: true },
      orderBy: { price: "asc" },
      select: { slug: true, title: true, level: true, thumbnail: true, price: true },
    }),
    prisma.cohort.count({ where: { status: "COMPLETED", number: { not: 0 } } }),
    prisma.user.count({ where: { isMember: true } }),
    prisma.strategy.count({ where: { status: "CERTIFIED" } }),
  ]);

  const open = cohorts.find((c) => c.status === "UPCOMING" || c.status === "ACTIVE");
  const latest = cohorts[0];
  const nextCohort = open
    ? {
        number: open.number,
        status: open.status === "ACTIVE" ? ("active" as const) : ("upcoming" as const),
        startDate: open.startDate.toISOString(),
      }
    : { number: (latest?.number ?? 0) + 1, status: "next" as const, startDate: null };

  return {
    nextCohort,
    courses: courses.map((c) => ({
      slug: c.slug,
      title: c.title,
      level: c.level,
      // Botcamp stores paths relative to botcamp.xyz; the files live here under /botcamp-assets.
      thumbnail: c.thumbnail?.startsWith("/") ? `/botcamp-assets${c.thumbnail}` : c.thumbnail,
      free: c.price === 0,
    })),
    stats: { cohorts: completed, members, certified },
  };
}
