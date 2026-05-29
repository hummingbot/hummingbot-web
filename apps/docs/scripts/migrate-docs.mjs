#!/usr/bin/env node
/**
 * Migrate the mkdocs "Documentation" section (~/hummingbot-site) into the
 * Mintlify Documentation tab, namespaced under /documentation/*.
 *
 * Input: /tmp/doc-nav.json (pruned nav tree). Produced by the Python step.
 *   node scripts/migrate-docs.mjs
 *
 * - Images/GIFs are stripped (the new site doesn't use migrated media).
 * - Internal mkdocs-relative links are rewritten:
 *     migrated doc page  → /documentation/<id>
 *     exchanges/<name>   → /exchanges/<name>
 *     blog/<...>         → /blog/<...>
 *     anything else      → https://hummingbot.org/<path>/ (live fallback)
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { convertAdmonitions, escapeForMdx, stripImages } from "./_sanitize.mjs";

const HOME = homedir();
const DOCS_SRC = join(HOME, "hummingbot-site", "docs");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tree = JSON.parse(readFileSync("/tmp/doc-nav.json", "utf8"));

rmSync(join(root, "documentation"), { recursive: true, force: true });

function pageId(p) {
  let id = p.replace(/\.md$/, "").replace(/\/index$/, "");
  if (id === "docs") id = "overview";
  return `documentation/${id}`;
}
const suffix = (p) => pageId(p).replace(/^documentation\//, "");

// Collect every migrated page's normalized suffix (for link resolution).
const docSuffixes = new Set();
(function collect(nodes) {
  for (const n of nodes) {
    if (n.page !== undefined) docSuffixes.add(suffix(n.page));
    else if (n.children) collect(n.children);
  }
})(tree);

function rewriteLinks(body, srcDir) {
  return body.replace(/\]\(([^)]+)\)/g, (m, target) => {
    if (/^(https?:|mailto:|tel:|#|\/)/.test(target)) return m;
    const [pathPart, anchor = ""] = target.split("#");
    if (!pathPart) return m;
    const abs = resolve(srcDir, pathPart);
    const rel = relative(DOCS_SRC, abs);
    if (rel.startsWith("..")) return m; // outside docs tree — leave alone
    const key = rel.replace(/\.md$/, "").replace(/\/index$/, "");
    const hash = anchor ? `#${anchor}` : "";
    const docKey = key === "docs" ? "overview" : key;
    if (docSuffixes.has(docKey)) return `](/documentation/${docKey}${hash})`;
    if (key === "exchanges" || key.startsWith("exchanges/"))
      return `](/${key}${hash})`;
    if (key.startsWith("blog/category")) return `](/blog/overview)`;
    if (key.startsWith("blog/")) return `](/${key}${hash})`;
    return `](https://hummingbot.org/${key}/${hash})`;
  });
}

function firstParagraph(body) {
  const text = stripImages(body)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[#*_>`|]/g, "");
  for (const para of text.split(/\n\s*\n/)) {
    const t = para.trim().replace(/\s+/g, " ");
    if (t.length > 30) return t.slice(0, 150).trim();
  }
  return "";
}

function sanitize(body, srcDir) {
  let out = stripImages(body);
  out = convertAdmonitions(out);
  out = rewriteLinks(out, srcDir);
  out = escapeForMdx(out);
  return out.trim();
}

let migrated = 0;
const missing = [];

function writePage(node) {
  const src = join(DOCS_SRC, node.page);
  if (!existsSync(src)) {
    missing.push(node.page);
    return false;
  }
  const raw = readFileSync(src, "utf8");
  const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const h1 = body.match(/^#\s+(.+)$/m);
  const bodyNoH1 = h1 ? body.replace(h1[0], "").trimStart() : body;
  const title = node.title || h1?.[1]?.trim() || node.page;
  const description = firstParagraph(bodyNoH1);
  const id = pageId(node.page);
  const dest = join(root, `${id}.mdx`);
  mkdirSync(dirname(dest), { recursive: true });
  const fm = `---\ntitle: ${JSON.stringify(title)}\n${description ? `description: ${JSON.stringify(description)}\n` : ""}---\n\n`;
  writeFileSync(dest, fm + sanitize(bodyNoH1, dirname(src)) + "\n");
  migrated++;
  return true;
}

function toPages(children) {
  const pages = [];
  for (const node of children) {
    if (node.page !== undefined) {
      if (writePage(node)) pages.push(pageId(node.page));
    } else if (node.children) {
      const sub = toPages(node.children);
      if (sub.length) pages.push({ group: node.title, pages: sub });
    }
  }
  return pages;
}

const groups = [];
for (const node of tree) {
  if (node.page !== undefined) {
    if (writePage(node)) groups.push({ group: node.title, pages: [pageId(node.page)] });
  } else if (node.children) {
    const pages = toPages(node.children);
    if (pages.length) groups.push({ group: node.title, pages });
  }
}

const docsJsonPath = join(root, "docs.json");
const config = JSON.parse(readFileSync(docsJsonPath, "utf8"));
config.navigation.tabs.find((t) => t.tab === "Documentation").groups = groups;
writeFileSync(docsJsonPath, JSON.stringify(config, null, 2) + "\n");

console.log(`[migrate-docs] ${migrated} pages, ${groups.length} groups, ${docSuffixes.size} link targets`);
if (missing.length) console.log(`  missing (skipped): ${missing.length}`);
