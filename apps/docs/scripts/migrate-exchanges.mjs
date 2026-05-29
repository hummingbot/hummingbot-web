#!/usr/bin/env node
/**
 * Migrate mkdocs exchange pages → Mintlify MDX under apps/docs/exchanges,
 * preserving slugs (/exchanges/<name>). Copies only referenced images.
 *
 *   node scripts/migrate-exchanges.mjs
 *
 * A `mint dev` preview is recommended to catch residual MDX/link edge cases.
 */
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { convertAdmonitions, escapeForMdx, stripImages, stripMdLinks } from "./_sanitize.mjs";

const HOME = homedir();
const SRC = join(HOME, "hummingbot-site/docs/exchanges");
const ASSETS = join(HOME, "hummingbot-site/docs/assets");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "exchanges");
const IMG = join(root, "images");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const titleCase = (s) =>
  s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bio\b/i, "IO");

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (extname(f) === ".md") out.push(p);
  }
  return out;
}

function copyAsset(srcRelFromExchanges, slugDir, srcFileDir) {
  // returns the new public path or null
  let abs;
  if (srcRelFromExchanges.startsWith("../")) abs = join(srcFileDir, srcRelFromExchanges);
  else abs = join(srcFileDir, srcRelFromExchanges);
  if (!existsSync(abs)) return null;
  const rel = relative(join(HOME, "hummingbot-site/docs"), abs).replace(/^(\.\.\/)+/, "");
  const dest = join(IMG, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(abs, dest);
  return `/images/${rel}`;
}

function sanitize(body) {
  let out = stripImages(body);
  out = convertAdmonitions(out);
  out = stripMdLinks(out);
  out = escapeForMdx(out);
  return out.trim();
}

let count = 0;
for (const file of walk(SRC)) {
  const relPath = relative(SRC, file); // e.g. binance/index.md or bitrue.md
  const slug = relPath.replace(/\/index\.md$/, "").replace(/\.md$/, ""); // binance, bitrue
  const raw = readFileSync(file, "utf8");
  const fmMatch = raw.match(/^---\n[\s\S]*?\n---\n?/);
  const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;
  const h1 = body.match(/^#\s+(.+)$/m);
  const title = (h1?.[1] || titleCase(basename(slug))).trim();
  const bodyNoH1 = h1 ? body.replace(h1[0], "").trimStart() : body;

  const dest = join(OUT, `${slug}.mdx`);
  mkdirSync(dirname(dest), { recursive: true });
  const fm = `---\ntitle: ${JSON.stringify(title)}\n---\n\n`;
  writeFileSync(dest, fm + sanitize(bodyNoH1) + "\n");
  count++;
}

console.log(`[migrate-exchanges] ${count} exchange pages → ${OUT}`);
