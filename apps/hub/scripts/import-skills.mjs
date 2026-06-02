// Transfer skills from the hummingbot/skills GitHub repo into the hub registry.
//
// The skills repo (https://github.com/hummingbot/skills) is the source of truth
// for AI-assistant skills. Each skill lives at skills/<name>/SKILL.md with YAML
// frontmatter (`name`, `description`). This script crawls the repo, parses that
// frontmatter, and writes one registry entry per skill (type: "skill", runtime:
// "mcp") into src/content/registry.json — replacing any existing skill entries
// so re-running is idempotent. Other entry types (strategies, routines) and the
// publishers list are left untouched.
//
// Usage:  node scripts/import-skills.mjs
//
// Requires network access to the GitHub API + raw.githubusercontent.com.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO = "hummingbot/skills";
const BRANCH = "main";
const NAMESPACE = "hummingbot";
// Real install counts live in the skills repo (it owns skills.hummingbot.org),
// keyed by skill name. We read them from there so the count has one source.
const INSTALLS_PATH = "app/src/data/installs.json";
const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(__dirname, "..", "src", "content", "registry.json");

async function getJSON(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "hummingbot-hub-import" },
  });
  if (!res.ok) throw new Error(`GitHub request failed (${res.status}) for ${url}`);
  return res.json();
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error("SKILL.md is missing YAML frontmatter");
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return fm;
}

async function main() {
  const tree = await getJSON(
    `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
  );
  if (!tree.tree) throw new Error("Unexpected tree response from GitHub");
  if (tree.truncated) throw new Error("Repo tree was truncated — paginate the crawl");

  // Repo layout is flat: skills/<name>/SKILL.md
  const skillPaths = tree.tree
    .map((t) => t.path)
    .filter((p) => /^skills\/[^/]+\/SKILL\.md$/i.test(p))
    .sort();

  if (skillPaths.length === 0) throw new Error("No SKILL.md files found in repo");

  // Install counts, sourced from the skills repo (keyed by skill name).
  const installs = await getJSON(
    `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${INSTALLS_PATH}`,
  );

  const updated = new Date().toISOString().slice(0, 10);
  const skills = [];
  for (const path of skillPaths) {
    const dir = path.split("/")[1];
    const rawUrl =
      `https://raw.githubusercontent.com/${REPO}/${BRANCH}/` +
      path.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(rawUrl);
    if (!res.ok) throw new Error(`Failed to fetch ${rawUrl} (${res.status})`);
    const fm = parseFrontmatter(await res.text());
    if (!fm.description) throw new Error(`${path} frontmatter is missing a description`);

    skills.push({
      type: "skill",
      namespace: NAMESPACE,
      name: fm.name || dir,
      summary: fm.description,
      description: fm.description,
      tags: [],
      exchanges: [],
      categories: [], // repo is flat — no category grouping to mirror
      license: "Apache-2.0",
      runtime: "mcp",
      latest: "1.0.0",
      versions: ["1.0.0"],
      updated,
      certified: true,
      hasSource: false,
      hasVideo: false,
      authorName: "Hummingbot Foundation",
      repoURL: `https://github.com/${REPO}/tree/${BRANCH}/skills/${dir}`,
      ...(installs[dir] != null ? { installs: installs[dir] } : {}),
    });
  }

  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  registry.primitives = [
    ...registry.primitives.filter((e) => e.type !== "skill"),
    ...skills,
  ];

  // Every skill is published under @hummingbot — make sure that publisher exists
  // so skills always resolve a publisher even if import-skills runs standalone.
  if (!registry.publishers.some((p) => p.handle === NAMESPACE)) {
    registry.publishers.push({
      handle: NAMESPACE,
      name: "Hummingbot Foundation",
      bio: "The team behind the open-source Hummingbot client — official strategies, routines, and skills.",
      joined: "2019-04-01",
    });
    registry.publishers.sort((a, b) => a.name.localeCompare(b.name));
  }

  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n");

  console.log(
    `Imported ${skills.length} skills → registry now has ${registry.primitives.length} primitives.`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
