import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/get-started";

/**
 * Open to every crawler, AI assistants included: people ask ChatGPT, Claude
 * and Perplexity to help them install Hummingbot, and those need to read us.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
