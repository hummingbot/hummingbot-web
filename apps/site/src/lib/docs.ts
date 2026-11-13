/**
 * Hummingbot docs, served inside this site at /docs.
 *
 * Content comes from the mkdocs repo (hummingbot/hummingbot-site): its
 * `mkdocs.yml` nav drives the sidebar and its `docs/*.md` files are the pages.
 * Point DOCS_SOURCE_DIR at a checkout; it defaults to a sibling of this repo.
 * mkdocs-only syntax (admonitions, tabs, snippets, attr lists, icon
 * shortcodes) is converted to plain markdown + HTML in `toMarkdown`.
 */
import fs from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import yaml from "js-yaml";

export const DOCS_SOURCE_DIR =
  process.env.DOCS_SOURCE_DIR ?? path.resolve(process.cwd(), "../../../hummingbot-site");
const DOCS_DIR = path.join(DOCS_SOURCE_DIR, "docs");

export const DOCS_BASE = "/docs";
export const DOCS_ASSETS_BASE = "/docs-assets";
export const DOCS_EDIT_BASE = "https://github.com/hummingbot/hummingbot-site/edit/main/docs";

export type DocNavNode = {
  title: string;
  /** Route for a page, or an absolute URL for an external link. */
  href?: string;
  external?: boolean;
  children?: DocNavNode[];
};

export type DocSection = {
  id: string;
  title: string;
  /** Route of the section's landing page. */
  href: string;
  nodes: DocNavNode[];
};

// Top-level mkdocs nav entries that are docs. The rest (Home, Bounties,
// Community, Foundation, Blog) are pages of this site already.
const SECTIONS: { key: string; id: string; title: string }[] = [
  { key: "Documentation", id: "hummingbot", title: "Hummingbot" },
  { key: "Exchanges", id: "exchanges", title: "Exchanges" },
  { key: "Releases", id: "releases", title: "Release Notes" },
];

/* ------------------------------------------------------------------ */
/* Paths and routes                                                    */
/* ------------------------------------------------------------------ */

/** docs-relative file path (e.g. "installation/condor.md") → route. */
export function fileToRoute(file: string): string {
  const p = path.posix.normalize(file).replace(/\.md$/, "").replace(/(^|\/)index$/, "");
  if (p === "docs" || p === "" || p === ".") return DOCS_BASE;
  return `${DOCS_BASE}/${p}`;
}

/** Route slug segments → docs-relative file path, or null if none exists. */
export function slugToFile(slug: string[]): string | null {
  if (slug.some((s) => s === ".." || s.includes("\\"))) return null;
  if (slug.length === 0) return "docs/index.md";
  const base = slug.join("/");
  for (const candidate of [`${base}.md`, `${base}/index.md`]) {
    if (fs.existsSync(path.join(DOCS_DIR, candidate))) return candidate;
  }
  return null;
}

/** Resolve a link or image URL written in `fromFile` to a site URL. */
export function resolveDocUrl(fromFile: string, url: string): string {
  if (!url || /^(?:[a-z]+:|#|\/\/)/i.test(url)) return url;
  const [rawPath, hash = ""] = url.split("#");
  const anchor = hash ? `#${hash}` : "";
  if (!rawPath) return anchor;

  const target = rawPath.startsWith("/")
    ? path.posix.normalize(rawPath.slice(1))
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), rawPath));
  if (target.startsWith("..")) return url;

  const ext = path.posix.extname(target.replace(/\/$/, ""));
  if (ext === ".md" || ext === "") return fileToRoute(target.replace(/\/$/, "")) + anchor;
  return `${DOCS_ASSETS_BASE}/${target}`;
}

/* ------------------------------------------------------------------ */
/* Nav                                                                  */
/* ------------------------------------------------------------------ */

type RawNavEntry = string | Record<string, string | RawNavEntry[]>;

function cleanTitle(title: string): string {
  // Drop the emoji markers mkdocs titles use ("🔥 Binance", "Board ↗️").
  return title.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}]/gu, "").trim();
}

function toNode(entry: RawNavEntry): DocNavNode | null {
  if (typeof entry === "string") return { title: "", href: fileToRoute(entry) };
  const [title, value] = Object.entries(entry)[0] ?? [];
  if (!title) return null;
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) return { title: cleanTitle(title), href: value, external: true };
    return { title: cleanTitle(title), href: fileToRoute(value) };
  }
  const children = (value ?? []).map(toNode).filter((n): n is DocNavNode => !!n);
  // mkdocs convention: a group's first child named like the group is its index page.
  const [first, ...rest] = children;
  if (first && first.href && !first.children && (first.title === cleanTitle(title) || !first.title)) {
    return { title: cleanTitle(title), href: first.href, children: rest.length ? rest : undefined };
  }
  return { title: cleanTitle(title), children };
}

let cachedSections: DocSection[] | null = null;

export function getDocSections(): DocSection[] {
  if (cachedSections && process.env.NODE_ENV === "production") return cachedSections;
  const config = fs.readFileSync(path.join(DOCS_SOURCE_DIR, "mkdocs.yml"), "utf8");
  // Parse only the nav: the rest of mkdocs.yml uses python-specific YAML tags.
  const navYaml = config.slice(config.search(/^nav:/m));
  const { nav } = yaml.load(navYaml) as { nav: RawNavEntry[] };

  cachedSections = SECTIONS.flatMap(({ key, id, title }) => {
    const entry = nav.find((e) => typeof e === "object" && key in e);
    const node = entry ? toNode(entry) : null;
    if (!node) return [];
    return [{ id, title, href: node.href ?? DOCS_BASE, nodes: node.children ?? [] }];
  });
  return cachedSections;
}

function flatten(nodes: DocNavNode[]): DocNavNode[] {
  return nodes.flatMap((n) => [
    ...(n.href && !n.external ? [n] : []),
    ...flatten(n.children ?? []),
  ]);
}

/** The section a route belongs to, plus its previous/next pages. */
export function locate(route: string) {
  const sections = getDocSections();
  for (const section of sections) {
    const pages = [{ title: `${section.title} Overview`, href: section.href }, ...flatten(section.nodes)];
    const i = pages.findIndex((p) => p.href === route);
    if (i !== -1) return { section, prev: pages[i - 1] ?? null, next: pages[i + 1] ?? null };
  }
  return { section: sections[0], prev: null, next: null };
}

/** Every routable docs page, for generateStaticParams. */
export function getAllDocRoutes(): string[] {
  return [
    ...new Set(
      getDocSections().flatMap((s) => [s.href, ...flatten(s.nodes).map((n) => n.href!)]),
    ),
  ];
}

/* ------------------------------------------------------------------ */
/* Pages                                                                */
/* ------------------------------------------------------------------ */

export type DocHeading = { depth: 2 | 3; text: string; id: string };

export type DocPage = {
  file: string;
  route: string;
  title: string;
  body: string;
  headings: DocHeading[];
  editUrl: string;
};

export function getDocPage(slug: string[]): DocPage | null {
  const file = slugToFile(slug);
  if (!file) return null;
  const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");

  let body = toMarkdown(raw);
  const h1 = body.match(/^# (.+)$/m);
  const title = h1 ? stripInline(h1[1]) : titleFromFile(file);
  if (h1) body = body.replace(h1[0], "");

  return {
    file,
    route: fileToRoute(file),
    title,
    body,
    headings: extractHeadings(body),
    editUrl: `${DOCS_EDIT_BASE}/${file}`,
  };
}

function titleFromFile(file: string): string {
  const name = path.posix.basename(file.replace(/\/index\.md$|\.md$/, ""));
  return name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripInline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** h2/h3 outside code fences, with the ids rehype-slug will give them. */
function extractHeadings(md: string): DocHeading[] {
  const slugger = new GithubSlugger();
  const out: DocHeading[] = [];
  let fence: string | null = null;
  for (const line of md.split("\n")) {
    const f = line.match(/^\s*(```+|~~~+)/);
    if (f) {
      fence = fence === null ? f[1] : line.trim().startsWith(fence) ? null : fence;
      continue;
    }
    if (fence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = stripInline(m[2]);
    const id = slugger.slug(text); // keep the slugger in step for every level
    if (m[1].length === 2 || m[1].length === 3) {
      out.push({ depth: m[1].length as 2 | 3, text, id });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* mkdocs syntax → markdown + HTML                                      */
/* ------------------------------------------------------------------ */

// Title may be quoted ("Title"), bare (Title), or omitted. Leading indent is
// kept so blocks nested in list items stay in their item.
const ADMONITION = /^(\s*)(!!!|\?\?\?\+?)\s+([\w-]+)(?:\s+(?:"([^"]*)"|(.+?)))?\s*$/;
const TAB = /^(\s*)===\+?\s+"([^"]*)"\s*$/;
const SNIPPET = /^--8<--\s+"([^"]+)"\s*$/;

/** Lines indented 4 past `indent` under a block opener, dedented to `indent`. */
function takeIndented(lines: string[], start: number, indent = ""): { inner: string[]; end: number } {
  const inner: string[] = [];
  const prefix = new RegExp(`^${indent}( {4}|\\t)`);
  let i = start;
  while (i < lines.length && (lines[i].trim() === "" || prefix.test(lines[i]))) {
    inner.push(lines[i].replace(prefix, ""));
    i++;
  }
  while (inner.length && inner[inner.length - 1].trim() === "") inner.pop();
  return { inner, end: i };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function convertLines(lines: string[], depth = 0): string[] {
  const out: string[] = [];
  let fence: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const f = line.match(/^\s*(```+|~~~+)/);
    if (f) {
      fence = fence === null ? f[1] : line.trim().startsWith(fence) ? null : fence;
      out.push(line);
      continue;
    }
    if (fence) {
      out.push(line);
      continue;
    }

    const snippet = line.match(SNIPPET);
    if (snippet && depth < 3) {
      const file = path.join(DOCS_SOURCE_DIR, snippet[1]);
      if (file.startsWith(DOCS_SOURCE_DIR) && fs.existsSync(file)) {
        out.push(...convertLines(fs.readFileSync(file, "utf8").split("\n"), depth + 1));
      }
      continue;
    }

    const adm = line.match(ADMONITION);
    if (adm) {
      const [, indent, marker, rawType, quoted, bare] = adm;
      const type = rawType.toLowerCase();
      const { inner, end } = takeIndented(lines, i + 1, indent);
      const title = quoted ?? bare ?? type.charAt(0).toUpperCase() + type.slice(1);
      const body = convertLines(inner, depth);
      const block: string[] = [];
      if (marker.startsWith("???")) {
        block.push(
          `<details class="admonition admonition-${type}"${marker.endsWith("+") ? " open" : ""}>`,
          `<summary>${escapeHtml(title)}</summary>`,
          "",
          ...body,
          "",
          "</details>",
          "",
        );
      } else {
        block.push(
          `<div class="admonition admonition-${type}">`,
          title ? `<p class="admonition-title">${escapeHtml(title)}</p>` : "",
          "",
          ...body,
          "",
          "</div>",
          "",
        );
      }
      out.push(...block.map((l) => (l ? indent + l : l)));
      i = end - 1;
      continue;
    }

    if (TAB.test(line)) {
      // A run of `=== "Label"` blocks becomes one labeled group.
      out.push('<div class="tabbed">', "");
      let j = i;
      while (j < lines.length) {
        const tab = lines[j].match(TAB);
        if (!tab) break;
        const { inner, end } = takeIndented(lines, j + 1, tab[1]);
        out.push(
          `<div class="tabbed-panel">`,
          `<p class="tabbed-label">${escapeHtml(tab[2])}</p>`,
          "",
          ...convertLines(inner, depth),
          "",
          "</div>",
          "",
        );
        j = end;
        while (j < lines.length && lines[j].trim() === "") j++;
      }
      out.push("</div>", "");
      i = j - 1;
      continue;
    }

    out.push(
      line
        // attr lists: `{ .md-button }`, `{: target="_blank" }`
        .replace(/\{:?\s*[.#:][^}\n]*\}/g, "")
        .replace(/\{:?\s*target="_blank"\s*\}/g, "")
        // material icon shortcodes
        .replace(/:(?:material|fontawesome|octicons|simple)-[a-z0-9-]+:\s?/g, "")
        // mkdocs autolinks to site paths (<\/bylaws.pdf>); CommonMark only
        // autolinks URLs with a scheme
        // (a path with a dot or a second slash, so closing tags never match)
        .replace(/<(\/[^\s<>/]*(?:\.[^\s<>]+|\/[^\s<>]*))>/g, "[$1]($1)"),
    );
  }
  return out;
}

export function toMarkdown(source: string): string {
  return convertLines(source.replace(/\r\n/g, "\n").split("\n")).join("\n");
}
