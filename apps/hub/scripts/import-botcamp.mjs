#!/usr/bin/env node
/**
 * Import public, certified Botcamp strategies → src/content/registry.json.
 *
 * Source query (botcamp-postgres, local :5433) is exported to a JSON file first:
 *
 *   docker exec botcamp-postgres psql -U botcamp -d botcamp -t -A -c "
 *     SELECT json_agg(t) FROM ( SELECT s.slug, s.title, s.description AS summary,
 *       s.tags, s.exchanges, s.\"videoURL\" AS video, s.\"strategyType\" AS stype,
 *       s.\"updatedAt\" AS updated, c.number AS cohort,
 *       (SELECT count(*)::int FROM strategy_files f WHERE f.\"strategyId\"=s.id) AS files,
 *       (SELECT json_agg(json_build_object('name', COALESCE(NULLIF(TRIM(COALESCE(u.\"firstName\",'')||' '||COALESCE(u.\"lastName\",'')),''), u.name,'Anonymous'),'slug',u.slug))
 *          FROM strategy_authors sa JOIN users u ON u.id=sa.\"userId\" WHERE sa.\"strategyId\"=s.id) AS authors
 *       FROM strategies s LEFT JOIN cohorts c ON c.id=s.\"cohortId\"
 *       WHERE s.visibility='PUBLIC' AND s.status='CERTIFIED'
 *       ORDER BY c.number DESC NULLS LAST, s.\"certifiedAt\" DESC NULLS LAST ) t;
 *   " > /tmp/botcamp-strategies.json
 *
 * Then: node scripts/import-botcamp.mjs /tmp/botcamp-strategies.json
 *
 * Note: Botcamp did not track installs/stars, so those metrics are omitted
 * (not fabricated). They'll populate once the registry tracks real installs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const src = process.argv[2] ?? "/tmp/botcamp-strategies.json";
const rows = JSON.parse(readFileSync(src, "utf8"));
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "content", "registry.json");

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const classify = (r) => {
  const text = `${r.title} ${r.summary ?? ""} ${(r.tags ?? []).join(" ")}`.toLowerCase();
  if (r.stype === "AGENT" || /\bagents?\b/.test(text)) return "agent";
  if (/\broutines?\b/.test(text)) return "routine";
  return "strategy";
};

const CATEGORY_TAGS = new Set([
  "Market Making", "Arbitrage", "Liquidity Provision", "Directional",
  "Cross-Exchange", "Perp", "Other",
]);

const publishers = new Map();
const primitives = [];

for (const r of rows) {
  const author = r.authors?.[0];
  const handle = author?.slug || (author?.name ? slugify(author.name) : null) || "botcamp";
  const displayName = author?.name || "Botcamp";
  if (!publishers.has(handle)) {
    publishers.set(handle, {
      handle,
      name: displayName,
      bio: r.cohort != null ? `Certified Hummingbot developer — Botcamp Cohort ${r.cohort}.` : "Certified Hummingbot developer.",
      joined: (r.updated ?? "2024-01-01").slice(0, 10),
    });
  }

  const type = classify(r);
  const tags = (r.tags ?? []).filter(Boolean);
  primitives.push({
    type,
    namespace: handle,
    name: slugify(r.slug.replace(/^cohort-\d+-/, "")) || slugify(r.title),
    summary: r.summary?.trim() || r.title,
    description: r.summary?.trim() || r.title,
    tags,
    exchanges: (r.exchanges ?? []).filter(Boolean),
    categories: tags.filter((t) => CATEGORY_TAGS.has(t)),
    license: "Apache-2.0",
    runtime: type === "strategy" ? "hummingbot" : "condor",
    latest: "1.0.0",
    versions: ["1.0.0"],
    updated: (r.updated ?? "2024-01-01").slice(0, 10),
    cohort: r.cohort ?? null,
    certified: true,
    hasSource: (r.files ?? 0) > 0,
    hasVideo: !!r.video,
    videoURL: r.video ?? null,
    authorName: displayName,
  });
}

// De-dup names within a namespace
const seen = new Set();
for (const p of primitives) {
  let key = `${p.namespace}/${p.name}`;
  let i = 2;
  while (seen.has(key)) key = `${p.namespace}/${p.name}-${i++}`;
  if (key !== `${p.namespace}/${p.name}`) p.name = key.split("/")[1];
  seen.add(key);
}

const data = {
  publishers: [...publishers.values()].sort((a, b) => a.name.localeCompare(b.name)),
  primitives,
};
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(
  `[import-botcamp] ${primitives.length} primitives, ${publishers.size} publishers → ${out}`,
);
const byType = primitives.reduce((m, p) => ((m[p.type] = (m[p.type] ?? 0) + 1), m), {});
console.log("  by type:", byType);
