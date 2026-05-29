import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, normalize } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

// ── helpers ──────────────────────────────────────────────────────────────

function walkFiles(dir: string, pred: (p: string) => boolean): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p, pred));
    else if (pred(p)) out.push(p);
  }
  return out;
}

// Content pages are .mdx; repo-meta .md (README, CLAUDE) are not docs pages.
const mdxFiles = walkFiles(ROOT, (p) => p.endsWith(".mdx"));

// Route set with Mintlify resolution semantics: `a/b` is served by a/b.{mdx,md}
// or a/b/index.{mdx,md}.
const fileRoutes = new Set(mdxFiles.map((p) => relative(ROOT, p).replace(/\.mdx$/, "")));
const servable = (route: string) => fileRoutes.has(route) || fileRoutes.has(`${route}/index`);

const docsJson = JSON.parse(readFileSync(join(ROOT, "docs.json"), "utf8"));

/** Collect page-route strings from the navigation tree (ignore group/tab labels). */
function navPages(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(navPages);
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    return Object.entries(o)
      .filter(([k]) => ["navigation", "tabs", "groups", "pages", "anchors", "dropdowns"].includes(k))
      .flatMap(([, v]) => navPages(v));
  }
  return [];
}
const navRoutes = navPages(docsJson.navigation);

// Internal doc links that legitimately have no page in this (subset) docs set.
const KNOWN_MISSING = new Set<string>(["/blog/releases"]);
const ASSET_RE = /\.(png|jpe?g|svg|gif|pdf|py|json|ya?ml|csv|zip)$/i;
const LINK_RE = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// ── tests ────────────────────────────────────────────────────────────────

describe("docs.json", () => {
  it("is valid and declares a navigation tree", () => {
    expect(docsJson.navigation).toBeDefined();
    expect(navRoutes.length).toBeGreaterThan(0);
  });

  it("every navigation page resolves to a file", () => {
    const missing = navRoutes.filter((r) => !r.startsWith("http") && !servable(r));
    expect(missing, `nav entries without a page: ${missing.join(", ")}`).toEqual([]);
  });

  it("groups the Gateway DEX connectors under the gateway overview", () => {
    expect(navRoutes).toContain("exchanges/gateway");
    for (const dex of ["uniswap", "jupiter", "raydium", "meteora", "balancer"]) {
      expect(navRoutes).toContain(`exchanges/gateway/${dex}`);
    }
  });
});

describe("frontmatter", () => {
  it("every MDX page has a title", () => {
    const offenders: string[] = [];
    for (const p of mdxFiles) {
      const txt = readFileSync(p, "utf8");
      const fm = /^---\n([\s\S]*?)\n---/.exec(txt);
      if (!fm || !/^title:\s*\S/m.test(fm[1]!)) offenders.push(relative(ROOT, p));
    }
    expect(offenders, `pages missing frontmatter title: ${offenders.slice(0, 10).join(", ")}`).toEqual([]);
  });
});

describe("internal links resolve", () => {
  it("has no broken internal doc links (regression guard for migration fixes)", () => {
    const broken: string[] = [];
    for (const p of mdxFiles) {
      const fileDir = dirname(relative(ROOT, p));
      const txt = readFileSync(p, "utf8");
      for (const m of txt.matchAll(LINK_RE)) {
        const raw = m[1]!;
        if (/^(https?:|mailto:|tel:|#)/.test(raw)) continue;
        const path = raw.split("#")[0]!.replace(/\/$/, "");
        if (!path || ASSET_RE.test(path)) continue;
        const abs = path.startsWith("/")
          ? path.replace(/^\/+/, "")
          : normalize(join(fileDir, path));
        if (servable(abs)) continue;
        const display = path.startsWith("/") ? path : `/${abs}`;
        if (KNOWN_MISSING.has(display)) continue;
        broken.push(`${relative(ROOT, p)} -> ${raw}`);
      }
    }
    expect(broken, `broken internal links:\n${broken.slice(0, 20).join("\n")}`).toEqual([]);
  });
});

describe("referenced local images exist", () => {
  it("every relative image path points to a file", () => {
    const missing: string[] = [];
    const IMG_RE = /!\[[^\]]*\]\(([^)\s]+)\)|src=["']([^"']+)["']/g;
    for (const p of mdxFiles) {
      const fileDir = dirname(p);
      const txt = readFileSync(p, "utf8");
      for (const m of txt.matchAll(IMG_RE)) {
        const ref = (m[1] ?? m[2])!;
        if (!ref || /^(https?:|data:)/.test(ref)) continue;
        if (!/\.(png|jpe?g|svg|gif|webp)$/i.test(ref)) continue;
        const abs = ref.startsWith("/") ? join(ROOT, ref) : join(fileDir, ref);
        try {
          statSync(abs);
        } catch {
          missing.push(`${relative(ROOT, p)} -> ${ref}`);
        }
      }
    }
    // pull-request-board.png is a known-missing migration asset.
    const unexpected = missing.filter((m) => !m.endsWith("pull-request-board.png"));
    expect(unexpected, `missing images:\n${unexpected.slice(0, 20).join("\n")}`).toEqual([]);
  });
});
