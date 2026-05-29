#!/usr/bin/env node
/**
 * Rebrand docs.json + inject the Blog tab (grouped by category) and, if present,
 * the Exchanges tab. Run after migrate-blog.mjs (and migrate-exchanges.mjs).
 *
 *   node scripts/generate-nav.mjs
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsJsonPath = join(root, "docs.json");
const config = JSON.parse(readFileSync(docsJsonPath, "utf8"));

const CATEGORY_ORDER = [
  "Releases", "Roadmap", "Governance", "Connectors",
  "Interviews", "Tutorials", "Announcements", "Engineering",
];

// --- Rebrand ---
config.name = "Hummingbot";
config.colors = { primary: "#00C2CE", light: "#5FFFD7", dark: "#00B1BB" };

// --- Blog tab from migrated manifest ---
const manifest = JSON.parse(readFileSync(join(root, "blog", "_manifest.json"), "utf8"));
const byCat = new Map();
for (const e of manifest) {
  if (!byCat.has(e.category)) byCat.set(e.category, []);
  byCat.get(e.category).push(e);
}
const blogGroups = [{ group: "Blog", pages: ["blog/overview"] }];
for (const cat of CATEGORY_ORDER) {
  const entries = (byCat.get(cat) ?? []).sort((a, b) => b.date.localeCompare(a.date));
  if (entries.length) blogGroups.push({ group: cat, pages: entries.map((e) => `blog/${e.slug}`) });
}

const tabs = config.navigation.tabs.filter(
  (t) => t.tab !== "Blog" && t.tab !== "Exchanges",
);

// --- Exchanges tab (if migrated) ---
const exDir = join(root, "exchanges");
const exTab = [];
if (existsSync(exDir)) {
  const pages = readdirSync(exDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => `exchanges/${f.replace(/\.mdx$/, "")}`)
    .sort((a, b) => (a.endsWith("/overview") ? -1 : b.endsWith("/overview") ? 1 : a.localeCompare(b)));
  if (pages.length) {
    exTab.push({ tab: "Exchanges", groups: [{ group: "Connectors", pages }] });
  }
}

// Enforce tab order; unknown tabs fall to the end in their existing order.
const TAB_ORDER = ["Documentation", "Condor", "Hummingbot API", "Exchanges", "Blog", "Podcast"];
const all = [...tabs, ...exTab, { tab: "Blog", groups: blogGroups }];
config.navigation.tabs = all.sort((a, b) => {
  const ai = TAB_ORDER.indexOf(a.tab);
  const bi = TAB_ORDER.indexOf(b.tab);
  return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
});

writeFileSync(docsJsonPath, JSON.stringify(config, null, 2) + "\n");
console.log(
  `[generate-nav] docs.json updated · blog groups: ${blogGroups.length - 1} · exchanges tab: ${exTab.length ? "yes" : "no"}`,
);
