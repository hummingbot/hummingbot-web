/**
 * Hummingbot sections that live as pages on hummingbot.org today (mkdocs):
 * Foundation (docs/about/*) and Bounties (docs/bounties/*). Same content,
 * rendered on this site with its design. Pages load through lib/docs.ts.
 */
import { getDocPage, resolveDocUrl, type DocPage } from "./docs";

export type SectionPageDef = {
  /** Route segment under the section ("" = the section's landing page). */
  slug: string;
  /** Path segments of the mkdocs file, as getDocPage takes them. */
  source: string[];
  title: string;
};

export type SectionDef = {
  id: "foundation" | "bounties";
  base: string;
  kicker: string;
  /** Hero headline: the lead, then the part set on the gold marker. */
  title: { lead: string; highlight: string };
  /** Hero line; the landing page's intro. */
  tagline: string;
  pages: SectionPageDef[];
  actions: { label: string; href: string; primary?: boolean }[];
};

export const SECTIONS: Record<SectionDef["id"], SectionDef> = {
  foundation: {
    id: "foundation",
    base: "/foundation",
    kicker: "Hummingbot Foundation",
    title: { lead: "Open source,", highlight: "governed by its community." },
    tagline:
      "A not-for-profit that maintains the Hummingbot codebase and the HBOT governance system, so sophisticated trading technology stays open to everyone.",
    pages: [
      { slug: "", source: ["about"], title: "Foundation" },
      { slug: "board", source: ["about", "board"], title: "Board" },
      { slug: "sponsors", source: ["about", "sponsors"], title: "Sponsors" },
      { slug: "hbot", source: ["about", "hbot"], title: "HBOT Token" },
      { slug: "governance", source: ["about", "governance"], title: "Governance" },
      { slug: "proposals", source: ["about", "proposals"], title: "Proposals" },
      { slug: "whitepaper", source: ["about", "whitepaper"], title: "Whitepaper" },
    ],
    actions: [
      { label: "Vote with HBOT", href: "https://snapshot.org/#/hbot.eth", primary: true },
      { label: "Read the bylaws", href: "/docs-assets/bylaws.pdf" },
    ],
  },
  bounties: {
    id: "bounties",
    base: "/bounties",
    kicker: "Connector Bounties",
    title: { lead: "Get paid to build", highlight: "exchange connectors." },
    tagline:
      "Exchanges fund connectors, the Foundation runs the process, and community developers build and maintain them for HBOT and USDC bounties.",
    pages: [
      { slug: "", source: ["bounties"], title: "Bounties" },
      { slug: "lifecycle", source: ["bounties", "lifecycle"], title: "Lifecycle" },
      { slug: "contributors", source: ["bounties", "contributors"], title: "Contributors Guide" },
      { slug: "faq", source: ["bounties", "faq"], title: "FAQ" },
    ],
    actions: [
      { label: "Open bounties", href: "https://github.com/orgs/hummingbot/projects/7/views/1", primary: true },
      { label: "Contributors guide", href: "/bounties/contributors" },
    ],
  },
};

export function sectionPageHref(section: SectionDef, page: SectionPageDef): string {
  return page.slug ? `${section.base}/${page.slug}` : section.base;
}

/** Map a docs route (/docs/about/board) to where it lives on this site. */
function onSite(route: string): string {
  const [path, hash = ""] = route.split("#");
  const anchor = hash ? `#${hash}` : "";
  const blog = path.match(/^\/docs\/blog\/posts\/([^/]+)/);
  if (blog) return `/blog/${blog[1]}${anchor}`;
  for (const section of Object.values(SECTIONS)) {
    for (const page of section.pages) {
      if (path === `/docs/${page.source.join("/")}`) return sectionPageHref(section, page) + anchor;
    }
  }
  return route;
}

/** Resolve a link in a section page: docs-relative, then onto this site. */
export function resolveSectionUrl(page: DocPage, url: string): string {
  return onSite(resolveDocUrl(page.file, url));
}

export function getSectionPage(id: SectionDef["id"], slug: string) {
  const section = SECTIONS[id];
  const index = section.pages.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  const def = section.pages[index];
  const doc = getDocPage(def.source);
  if (!doc) return null;
  // Live HBOT figures are filled in by script on hummingbot.org; show a dash.
  const body = doc.body.replace(/<span id="[a-z-]+">\.\.\.<\/span>/g, "—");
  return {
    section,
    def,
    doc: { ...doc, body },
    prev: section.pages[index - 1] ?? null,
    next: section.pages[index + 1] ?? null,
  };
}
