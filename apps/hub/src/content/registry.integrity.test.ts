import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import data from "./registry.json";
import { loadSources } from "@/lib/sources";
import type { Primitive } from "@/lib/registry";

const primitives = data.primitives as Primitive[];
const publishers = data.publishers as { handle: string }[];
const handles = new Set(publishers.map((p) => p.handle));

const TYPES = new Set(["strategy", "routine", "agent"]);
const RUNTIMES = new Set(["hummingbot", "condor"]);
const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

describe("registry.json schema", () => {
  it("has primitives and publishers", () => {
    expect(primitives.length).toBeGreaterThan(0);
    expect(publishers.length).toBeGreaterThan(0);
  });

  it("every primitive has well-formed core fields", () => {
    for (const p of primitives) {
      const id = `${p.type}/${p.namespace}/${p.name}`;
      expect(TYPES, id).toContain(p.type);
      expect(RUNTIMES, id).toContain(p.runtime);
      expect(p.namespace, id).toBeTruthy();
      expect(p.name, id).toBeTruthy();
      expect(p.summary, id).toBeTruthy();
      expect(Array.isArray(p.tags), id).toBe(true);
      expect(Array.isArray(p.exchanges), id).toBe(true);
      expect(Array.isArray(p.categories), id).toBe(true);
      expect(p.versions.length, id).toBeGreaterThan(0);
      expect(p.versions, id).toContain(p.latest);
      expect(isISODate(p.updated), `${id} updated=${p.updated}`).toBe(true);
    }
  });

  it("primitive identities (type/namespace/name) are unique", () => {
    const seen = new Set<string>();
    for (const p of primitives) {
      const key = `${p.type}/${p.namespace}/${p.name}`;
      expect(seen.has(key), `duplicate ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("every primitive namespace has a matching publisher", () => {
    for (const p of primitives) {
      expect(handles.has(p.namespace), `missing publisher @${p.namespace}`).toBe(true);
    }
  });
});

describe("bundled source files exist on disk", () => {
  it("loadSources resolves every declared file for every primitive", () => {
    for (const p of primitives) {
      if (!p.files?.length) continue;
      const loaded = loadSources(p);
      expect(loaded.length, `${p.namespace}/${p.name} bundled files`).toBe(p.files.length);
      for (const f of loaded) expect(f.code.length).toBeGreaterThan(0);
    }
  });
});

describe("first-party primitives", () => {
  const firstParty = primitives.filter((p) => p.namespace === "condor" || p.namespace === "hummingbot");

  it("exist (routines + scripts + v1 were imported)", () => {
    expect(firstParty.length).toBeGreaterThanOrEqual(29);
  });

  it("all bundle source and link to a GitHub repo", () => {
    for (const p of firstParty) {
      expect(p.hasSource, `${p.name} hasSource`).toBe(true);
      expect(p.files?.length, `${p.name} files`).toBeGreaterThan(0);
      expect(p.repoURL, `${p.name} repoURL`).toMatch(/^https:\/\/github\.com\/hummingbot\//);
    }
  });

  it("routines are well-formed and ship an existing example report", () => {
    const routines = firstParty.filter((p) => p.type === "routine");
    expect(routines.length).toBeGreaterThan(0);
    for (const r of routines) {
      expect(r.runtime).toBe("condor");
      expect(r.subtype).toBe("routine");
      expect(typeof r.continuous).toBe("boolean");
      expect(r.reportURL, `${r.name} reportURL`).toMatch(/^\/reports\/.+\.html$/);
      const file = join(process.cwd(), "public", r.reportURL!);
      expect(existsSync(file), `report file ${r.reportURL}`).toBe(true);
    }
  });

  it("strategies carry a script | v1 subtype", () => {
    const strategies = firstParty.filter((p) => p.type === "strategy");
    expect(strategies.length).toBeGreaterThan(0);
    for (const s of strategies) {
      expect(["script", "v1"], `${s.name} subtype`).toContain(s.subtype);
      expect(s.runtime).toBe("hummingbot");
    }
  });
});
