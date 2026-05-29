#!/usr/bin/env node
/**
 * Migrate the mkdocs "Documentation" section (~/hummingbot-site) into the
 * Mintlify Documentation tab, namespaced under /documentation/* to avoid
 * colliding with the existing Condor docs at the root.
 *
 * Input: /tmp/doc-nav.json (the pruned nav tree from mkdocs.yml — Strategies V1
 * and script examples already removed). Produced by the Python step in this PR.
 *
 *   node scripts/migrate-docs.mjs
 *
 * Patches docs.json's Documentation tab groups. A `mint dev` pass is recommended
 * to catch residual MDX / cross-link edge cases.
 */
import {
  cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { convertAdmonitions, escapeForMdx, stripMdLinks } from "./_sanitize.mjs";

const HOME = homedir();
const DOCS_SRC = join(HOME, "hummingbot-site", "docs");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tree = JSON.parse(readFileSync("/tmp/doc-nav.json", "utf8"));

// clean previous run (namespaced dir only)
rmSync(join(root, "documentation"), { recursive: true, force: true });

function pageId(p) {
  let id = p.replace(/\.md$/, "").replace(/\/index$/, "");
  if (id === "docs") id = "overview";
  return `documentation/${id}`;
}

function firstParagraph(body) {
  const text = body.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/<[^>]+>/g, "").replace(/[#*_>`|]/g, "");
  for (const para of text.split(/\n\s*\n/)) {
    const t = para.trim().replace(/\s+/g, " ");
    if (t.length > 30) return t.slice(0, 150).trim();
  }
  return "";
}

function copyImage(refPath, srcFileDir) {
  if (/^https?:/.test(refPath) || refPath.startsWith("/")) return null;
  const abs = resolve(srcFileDir, refPath.split("#")[0]);
  if (!existsSync(abs) || !abs.startsWith(DOCS_SRC)) return null;
  const rel = relative(DOCS_SRC, abs);
  const dest = join(root, "images", rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(abs, dest);
  return `/images/${rel}`;
}

function sanitize(body, srcFileDir) {
  let out = convertAdmonitions(body);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+?)(#only-[a-z]+)?\)/g, (_m, alt, p) => {
    const np = copyImage(p, srcFileDir);
    return `![${alt}](${np ?? p})`;
  });
  out = out.replace(/(<img[^>]*\ssrc=")(?!https?:|\/)([^"]+)(")/g, (_m, a, p, b) => {
    const np = copyImage(p, srcFileDir);
    return `${a}${np ?? p}${b}`;
  });
  out = stripMdLinks(out);
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

// Build Mintlify group tree while migrating files.
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

// Patch docs.json Documentation tab
const docsJsonPath = join(root, "docs.json");
const config = JSON.parse(readFileSync(docsJsonPath, "utf8"));
const docTab = config.navigation.tabs.find((t) => t.tab === "Documentation");
docTab.groups = groups;
writeFileSync(docsJsonPath, JSON.stringify(config, null, 2) + "\n");

console.log(`[migrate-docs] migrated ${migrated} pages into ${groups.length} groups`);
if (missing.length) console.log(`  missing source (skipped): ${missing.length}`, missing.slice(0, 5));
