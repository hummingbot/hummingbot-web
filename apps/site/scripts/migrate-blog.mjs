#!/usr/bin/env node
/**
 * Migrate the upstream mkdocs blog into the marketing site.
 *
 * Source : ~/hummingbot-site/docs/blog/posts/<dir>/index.md  (+ co-located images)
 * Output : apps/site/src/content/blog/<slug>.md               (normalized frontmatter + cleaned body)
 *          apps/site/public/blog/<slug>/<image>               (cover + inline images)
 *          apps/site/scripts/blog-redirects.json              (slug list for docs redirects)
 *
 * The upstream posts carry date/authors/categories in frontmatter but the TITLE
 * is the first `# heading` in the body. We lift that out, drop the cover image
 * line (rendered separately), derive an excerpt from the `<!-- more -->` marker,
 * normalize authors/categories via maps, rewrite relative image + post links,
 * and convert mkdocs admonitions to blockquotes. Run: npm run migrate:blog
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, basename, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..");
const SRC = join(homedir(), "hummingbot-site", "docs", "blog", "posts");
const OUT_CONTENT = join(SITE, "src", "content", "blog");
const OUT_PUBLIC = join(SITE, "public", "blog");
const DOCS = "https://docs.hummingbot.org";

const AUTHORS = {
  foundation: "Hummingbot Foundation",
  coinalpha: "CoinAlpha",
  team: "Hummingbot Team",
  community: "Hummingbot Community",
  fede: "Federico Cardoso",
  mike: "Michael Feng",
  carlo: "Carlo Las Marias",
  martin: "Martin Kou",
  broll: "Brandon Roller",
  dennis: "Dennis Pao",
};

// Collapse the 16 upstream categories into a clean editorial set.
const CATEGORY_MAP = {
  Academy: "Tutorials",
  "Market Making Basics": "Tutorials",
  "Strategy Guides": "Strategies",
  "Quickstart Guides": "Tutorials",
  Developers: "Engineering",
  "Hummingbot Technical Architecture": "Engineering",
  Reports: "Announcements",
  Competitions: "Announcements",
  Partnerships: "Announcements",
  Bounties: "Community",
  Botcamp: "Community",
  "Community Posts": "Community",
  Miner: "Mining",
  "Liquidity Mining": "Mining",
  "User Interviews": "Interviews",
  "Connector Guides": "Connectors",
  "Crypto Exchange Landscape": "Connectors",
  Whitepapers: "Research",
  Podcasts: "Podcast",
  Maintenance: "Governance",
  // pass-through: Announcements, Governance, Engineering, Roadmap
};

const stripDatePrefix = (s) => s.replace(/^\d{4}-/, "");
const titleCase = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  const block = m[1];
  const body = text.slice(m[0].length);
  const data = {};
  let key = null;
  for (const line of block.split("\n")) {
    const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    const item = /^\s*-\s*(.+)$/.exec(line);
    if (kv) {
      key = kv[1];
      data[key] = kv[2] === "" ? [] : kv[2].replace(/^["']|["']$/g, "");
    } else if (item && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(item[1].replace(/^["']|["']$/g, ""));
    }
  }
  return { data, body };
}

// mkdocs admonition block -> markdown blockquote. Handles `!!! type "Title"` and
// `??? type` with 4-space-indented content lines until dedent.
function convertAdmonitions(body) {
  const lines = body.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(?:!!!|\?\?\?)\+?\s+(\w+)(?:\s+"([^"]*)")?(?:\s+(.+))?\s*$/.exec(lines[i]);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    const label = m[2] || m[1].charAt(0).toUpperCase() + m[1].slice(1);
    out.push(`> **${label}**`);
    out.push(">");
    // Some posts put content inline after the type (`!!! Warning text...`).
    if (m[3] && m[3].trim()) out.push("> " + m[3].trim());
    i++;
    while (i < lines.length && (lines[i].startsWith("    ") || lines[i].trim() === "")) {
      if (lines[i].trim() === "") out.push(">");
      else out.push("> " + lines[i].replace(/^ {4}/, ""));
      i++;
    }
    i--; // re-process the dedented line
  }
  return out.join("\n");
}

function rewriteLinksAndImages(body, slug) {
  // Linked images `[![alt](img)](target)` (click-to-zoom in source) — drop the
  // outer link wrapper (its target is a relative diagram that doesn't exist
  // here) and keep just the inner image, handled by the image pass below.
  body = body.replace(/\[(!\[[^\]]*\]\([^)]+\))\]\(([^)]+)\)/g, (full, img, target) =>
    /^https?:\/\//.test(target) ? full : img,
  );

  // Inline images: ![alt](X). Local file -> /blog/<slug>/<basename>. A few
  // source posts misuse image syntax to point at another post's index.md —
  // demote those to a normal post link so they don't render as a broken image.
  body = body.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, url) => {
    if (/^https?:\/\//.test(url) || url.startsWith("/")) return full;
    const mdLink = /^\.\.\/([^/]+)\/(?:index\.md)?$/.exec(url.split("#")[0]);
    if (mdLink) return `[${alt}](/blog/${stripDatePrefix(mdLink[1])})`;
    if (/\.md(\?|#|$)/.test(url)) return alt; // stray .md image ref, no clean target
    return `![${alt}](/blog/${slug}/${basename(url)})`;
  });

  // Links: [text](X) (not images — negative lookbehind on `!`).
  body = body.replace(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g, (full, text, url) => {
    if (/^(https?:|mailto:|#|\/)/.test(url)) return full;
    const clean = url.split("#")[0];
    // ../<other>/index.md or ../<other>/ -> another blog post
    const blogLink = /^\.\.\/([^/]+)\/(?:index\.md)?$/.exec(clean);
    if (blogLink) return `[${text}](/blog/${stripDatePrefix(blogLink[1])})`;
    // release notes -> docs
    if (/release-notes/.test(clean)) {
      const v = clean.match(/(\d+\.\d+\.\d+)/);
      if (v) return `[${text}](${DOCS}/blog/hummingbot-v${v[1]})`;
    }
    // any other relative doc path -> absolute docs URL
    const path = clean
      .replace(/^(\.\.\/)+/, "")
      .replace(/\/?index\.md$/, "")
      .replace(/\.md$/, "");
    return `[${text}](${DOCS}/${path})`;
  });

  return body;
}

function makeExcerpt(body) {
  const beforeMore = body.split("<!-- more -->")[0];
  const text = beforeMore
    .replace(/^#.*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/<[^>]+>/g, "") // html tags
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links (incl. empty-text [](...))
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(" ").filter(Boolean);
  let out = words.slice(0, 40).join(" ");
  if (words.length > 40) out += "…";
  return out;
}

function run() {
  if (!existsSync(SRC)) {
    console.error("Source not found:", SRC);
    process.exit(1);
  }
  // Clean output dirs for an idempotent run.
  rmSync(OUT_CONTENT, { recursive: true, force: true });
  rmSync(OUT_PUBLIC, { recursive: true, force: true });
  mkdirSync(OUT_CONTENT, { recursive: true });
  mkdirSync(OUT_PUBLIC, { recursive: true });

  const dirs = readdirSync(SRC).filter((d) => existsSync(join(SRC, d, "index.md")));
  const slugs = [];
  const catCount = {};
  const warnings = [];

  for (const dir of dirs) {
    const slug = stripDatePrefix(dir);
    const raw = readFileSync(join(SRC, dir, "index.md"), "utf8");
    const { data, body } = parseFrontmatter(raw);

    const titleMatch = /^#\s+(.+)$/m.exec(body);
    const title = titleMatch ? titleMatch[1].trim() : titleCase(slug);
    if (!titleMatch) warnings.push(`${slug}: no H1 title, using slug`);

    const rawAuthor = Array.isArray(data.authors) ? data.authors[0] : data.authors;
    const author = AUTHORS[rawAuthor] || (rawAuthor ? titleCase(rawAuthor) : "Hummingbot Foundation");
    const rawCat = Array.isArray(data.categories) ? data.categories[0] : data.categories;
    const category = CATEGORY_MAP[rawCat] || rawCat || "News";
    catCount[category] = (catCount[category] || 0) + 1;
    const date = (data.date || "2020-01-01").toString().slice(0, 10);

    // Copy images; find a cover.
    const files = readdirSync(join(SRC, dir));
    let cover = "";
    mkdirSync(join(OUT_PUBLIC, slug), { recursive: true });
    for (const f of files) {
      if (f === "index.md") continue;
      const p = join(SRC, dir, f);
      if (!statSync(p).isFile()) continue;
      if (/\.(png|jpe?g|webp|gif|svg)$/i.test(f)) {
        copyFileSync(p, join(OUT_PUBLIC, slug, f));
        if (/^cover\.(png|jpe?g|webp)$/i.test(f)) cover = `/blog/${slug}/${f}`;
      }
    }
    if (!cover) warnings.push(`${slug}: no cover image`);

    // Clean body: drop title line + cover image line, transform.
    let clean = body
      .replace(/^#\s+.+$/m, "")
      .replace(/!?\[[^\]]*\]\(cover\.[a-z]+\)\s*/i, "") // cover as image OR bare link
      .replace(/<!-- more -->/g, "")
      .replace(/<!--[\s\S]*?-->/g, "");
    clean = convertAdmonitions(clean);
    clean = rewriteLinksAndImages(clean, slug);
    clean = clean.replace(/\n{3,}/g, "\n\n").trim();

    const excerpt = makeExcerpt(body);
    const description = excerpt.replace(/…$/, "").slice(0, 155);

    const esc = (s) => String(s).replace(/"/g, '\\"');
    const fm = [
      "---",
      `title: "${esc(title)}"`,
      `description: "${esc(description)}"`,
      `date: "${date}"`,
      `author: "${esc(author)}"`,
      `category: "${esc(category)}"`,
      `excerpt: "${esc(excerpt)}"`,
      `cover: "${cover}"`,
      "---",
      "",
    ].join("\n");

    writeFileSync(join(OUT_CONTENT, `${slug}.md`), fm + clean + "\n");
    slugs.push(slug);
  }

  writeFileSync(join(HERE, "blog-redirects.json"), JSON.stringify(slugs.sort(), null, 2) + "\n");

  console.log(`[migrate-blog] ${slugs.length} posts -> ${OUT_CONTENT}`);
  console.log("  by category:", catCount);
  if (warnings.length) {
    console.log(`  warnings (${warnings.length}):`);
    for (const w of warnings) console.log("   -", w);
  }
}

run();
