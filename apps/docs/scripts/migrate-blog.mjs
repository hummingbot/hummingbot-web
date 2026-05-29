#!/usr/bin/env node
/**
 * Migrate the mkdocs blog + release notes into Mintlify MDX under apps/docs/blog.
 *
 *   node scripts/migrate-blog.mjs
 *
 * Sources (absolute):
 *   ~/hummingbot-site/docs/blog/posts/<slug>/index.md   (103 posts)
 *   ~/hummingbot-site/docs/release-notes/<version>.md    (~47 releases)
 *
 * Output: apps/docs/blog/<slug>.mdx (+ images → apps/docs/images/blog/<slug>/)
 * and apps/docs/blog/_manifest.json (for docs.json group generation).
 *
 * Note: md→MDX is sanitized (braces escaped, mkdocs admonitions converted) but a
 * `mint dev` preview pass is recommended to catch residual MDX edge cases.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { convertAdmonitions, escapeForMdx, stripImages, stripMdLinks } from "./_sanitize.mjs";

const HOME = homedir();
const POSTS = join(HOME, "hummingbot-site/docs/blog/posts");
const RELEASES = join(HOME, "hummingbot-site/docs/release-notes");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_OUT = join(root, "blog");
const IMG_OUT = join(root, "images", "blog");

rmSync(BLOG_OUT, { recursive: true, force: true });
mkdirSync(BLOG_OUT, { recursive: true });
mkdirSync(IMG_OUT, { recursive: true });

const CATEGORIES = [
  "Releases", "Roadmap", "Governance", "Connectors",
  "Interviews", "Tutorials", "Announcements", "Engineering",
];

function mapCategory(cats, slug, title) {
  const c = (cats ?? []).map((x) => x.toLowerCase());
  const t = `${slug} ${title}`.toLowerCase();
  const has = (re) => c.some((x) => re.test(x)) || re.test(t);
  if (has(/release/)) return "Releases";
  if (has(/governance|epoch|hbot|proposal|poll|vote|bylaws/)) return "Governance";
  if (has(/roadmap|state of/)) return "Roadmap";
  if (has(/interview|origin story/)) return "Interviews";
  if (has(/connector|using .* with hummingbot|exchange/)) return "Connectors";
  if (has(/architecture|deep dive|coding|developer|controller|gateway/)) return "Engineering";
  if (has(/guide|tutorial|how to|quickstart|what is|basic|tips|strategy/)) return "Tutorials";
  return "Announcements";
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  let key = null;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    const item = line.match(/^\s*-\s+(.*)$/);
    if (kv) {
      key = kv[1];
      fm[key] = kv[2] === "" ? [] : kv[2].replace(/^["']|["']$/g, "");
    } else if (item && key) {
      if (!Array.isArray(fm[key])) fm[key] = [];
      fm[key].push(item[1].replace(/^["']|["']$/g, ""));
    }
  }
  return { fm, body: raw.slice(m[0].length) };
}

function firstParagraph(body) {
  const text = stripImages(body)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[#*_>`]/g, "");
  for (const para of text.split(/\n\s*\n/)) {
    const t = para.trim().replace(/\s+/g, " ");
    if (t.length > 30) return t.slice(0, 155).trim();
  }
  return "";
}

function sanitizeMdx(body) {
  let out = body.replace(/<!--\s*more\s*-->/g, "");
  out = stripImages(out);
  out = convertAdmonitions(out);
  out = stripMdLinks(out);
  out = escapeForMdx(out);
  return out.trim();
}

function yamlEscape(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`;
}

function writePost({ slug, title, description, date, category, body }) {
  const fm = [
    "---",
    `title: ${yamlEscape(title)}`,
    description ? `description: ${yamlEscape(description)}` : null,
    `date: ${yamlEscape(date)}`,
    `category: ${yamlEscape(category)}`,
    "---",
    "",
  ].filter((x) => x !== null).join("\n");
  writeFileSync(join(BLOG_OUT, `${slug}.mdx`), `${fm}\n${body}\n`);
}

const manifest = [];

// ---- Blog overview (landing page for the Blog tab) ----
writeFileSync(
  join(BLOG_OUT, "overview.mdx"),
  `---
title: "Blog"
description: "Releases, roadmaps, governance, connectors, interviews, and tutorials from the Hummingbot community."
---

The Hummingbot blog — product releases, roadmaps, governance recaps, connector
guides, community interviews, and trading tutorials. Browse by category in the
sidebar, or jump to the latest **[Releases](/blog/releases)**.
`,
);

// ---- Blog posts ----
for (const slug of readdirSync(POSTS)) {
  const dir = join(POSTS, slug);
  const index = join(dir, "index.md");
  if (!statSync(dir).isDirectory() || !existsSync(index)) continue;

  const raw = readFileSync(index, "utf8");
  const { fm, body } = parseFrontmatter(raw);
  const h1 = body.match(/^#\s+(.+)$/m);
  const title = (fm.title || h1?.[1] || slug.replace(/-/g, " ")).trim();
  const bodyNoH1 = h1 ? body.replace(h1[0], "").trimStart() : body;
  const description = firstParagraph(bodyNoH1);
  const date = String(Array.isArray(fm.date) ? fm.date[0] : fm.date || "2020-01-01").slice(0, 10);
  const category = mapCategory(fm.categories, slug, title);

  writePost({ slug, title, description, date, category, body: sanitizeMdx(bodyNoH1) });
  manifest.push({ slug, title, date, category, type: "post" });
}

// ---- Release notes ----
for (const file of readdirSync(RELEASES)) {
  if (!/^\d+\.\d+\.\d+\.md$/.test(file)) continue;
  const version = basename(file, ".md");
  const raw = readFileSync(join(RELEASES, file), "utf8");
  const { body } = parseFrontmatter(raw);
  const h1 = body.match(/^#\s+(.+)$/m);
  const title = h1?.[1]?.trim() || `Hummingbot v${version}`;
  const bodyNoH1 = h1 ? body.replace(h1[0], "").trimStart() : body;
  const dm = raw.match(/Released on\s+([A-Za-z]+ \d{1,2},\s*\d{4})/);
  const date = dm ? new Date(dm[1]).toISOString().slice(0, 10) : "2020-01-01";
  const slug = `hummingbot-v${version}`;
  writePost({
    slug,
    title,
    description: `Release notes for Hummingbot v${version}.`,
    date,
    category: "Releases",
    body: sanitizeMdx(bodyNoH1),
  });
  manifest.push({ slug, title, date, category: "Releases", type: "release", version });
}

manifest.sort((a, b) => b.date.localeCompare(a.date));
writeFileSync(join(BLOG_OUT, "_manifest.json"), JSON.stringify(manifest, null, 2));

const byCat = manifest.reduce((m, p) => ((m[p.category] = (m[p.category] ?? 0) + 1), m), {});
console.log(`[migrate-blog] ${manifest.length} entries →`, BLOG_OUT);
console.log("  by category:", byCat);
console.log("  categories order:", CATEGORIES.join(", "));
