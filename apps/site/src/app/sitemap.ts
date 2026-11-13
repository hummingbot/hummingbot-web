import type { MetadataRoute } from "next";
import { getAllDocRoutes } from "@/lib/docs";
import { SITE_URL } from "@/lib/get-started";

const PAGES = [
  "/",
  "/get-started",
  "/hub",
  "/botcamp",
  "/hackathons",
  "/exchanges",
  "/docs",
  "/builders",
  "/community",
  "/bounties",
  "/foundation",
  "/blog",
];

export default function sitemap(): MetadataRoute.Sitemap {
  let docs: string[] = [];
  try {
    docs = getAllDocRoutes();
  } catch {
    // The docs checkout is missing; list the rest.
  }
  return [...new Set([...PAGES, ...docs])].map((p) => ({
    url: `${SITE_URL}${p}`,
    priority: p === "/" || p === "/get-started" ? 1 : undefined,
  }));
}
