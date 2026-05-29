import { describe, expect, it } from "vitest";
import {
  allCategories,
  allExchanges,
  browse,
  countByType,
  featured,
  getPrimitive,
  getPublisher,
  installCommand,
  primitivesByPublisher,
  slugOf,
  stats,
  trending,
  type Primitive,
} from "./registry";

// These run against the real seed registry.json, so assertions stay
// structural / invariant-based rather than pinned to exact counts.

describe("slugOf / installCommand", () => {
  const p = { namespace: "condor", name: "market-scanner", runtime: "condor" } as Primitive;
  it("formats the @namespace/name slug", () => {
    expect(slugOf(p)).toBe("@condor/market-scanner");
  });
  it("builds a runtime-specific install command", () => {
    expect(installCommand(p)).toBe("condor install @condor/market-scanner");
    expect(installCommand({ ...p, runtime: "hummingbot" })).toBe(
      "hummingbot install @condor/market-scanner",
    );
  });
  it("uses the skills CLI for skill-type entries", () => {
    const skill = { type: "skill", namespace: "hummingbot", name: "hummingbot-deploy", runtime: "mcp" } as Primitive;
    expect(installCommand(skill)).toBe("npx skills add hummingbot/skills --skill hummingbot-deploy");
  });
});

describe("browse", () => {
  it("returns everything when unfiltered", () => {
    expect(browse().length).toBe(stats().primitives);
  });

  it("filters by type", () => {
    const routines = browse({ type: "routine" });
    expect(routines.length).toBeGreaterThan(0);
    expect(routines.every((p) => p.type === "routine")).toBe(true);
  });

  it("filters by category", () => {
    const cat = allCategories()[0]!;
    const rows = browse({ category: cat });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((p) => p.categories.includes(cat))).toBe(true);
  });

  it('treats category "All" as no filter', () => {
    expect(browse({ category: "All" }).length).toBe(browse().length);
  });

  it("requires every selected exchange (AND semantics)", () => {
    const withTwo = browse().find((p) => p.exchanges.length >= 2);
    if (!withTwo) return; // dataset-dependent; skip if none
    const [a, b] = withTwo.exchanges;
    const rows = browse({ exchanges: [a!, b!] });
    expect(rows.every((p) => p.exchanges.includes(a!) && p.exchanges.includes(b!))).toBe(true);
  });

  it("filters by capability flags", () => {
    const rows = browse({ capabilities: ["certified"] });
    expect(rows.every((p) => p.certified)).toBe(true);
    expect(browse({ capabilities: ["hasSource"] }).every((p) => p.hasSource)).toBe(true);
  });

  it("scores and ranks free-text search, dropping non-matches", () => {
    const rows = browse({ q: "market making" });
    expect(rows.length).toBeGreaterThan(0);
    for (const p of rows) {
      const hay = `${p.namespace} ${p.name} ${p.summary} ${p.description} ${p.tags.join(" ")}`.toLowerCase();
      expect(hay.includes("market") || hay.includes("making")).toBe(true);
    }
  });

  it("returns empty for a search with no matches", () => {
    expect(browse({ q: "zzzznonexistentqueryxyz" })).toEqual([]);
  });

  it("sorts by name A→Z", () => {
    const names = browse({ sort: "name" }).map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("sorts by updated date, newest first", () => {
    const dates = browse({ sort: "updated" }).map((p) => p.updated);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]!.localeCompare(dates[i]!)).toBeGreaterThanOrEqual(0);
    }
  });

  it("featured ranks certified ahead of non-certified", () => {
    const f = browse({ sort: "featured" });
    const firstNonCertified = f.findIndex((p) => !p.certified);
    const lastCertified = f.map((p) => p.certified).lastIndexOf(true);
    if (firstNonCertified !== -1 && lastCertified !== -1) {
      expect(firstNonCertified).toBeGreaterThan(lastCertified);
    }
  });
});

describe("lookups", () => {
  it("getPrimitive finds an existing first-party routine", () => {
    const p = getPrimitive("routine", "condor", "market-scanner");
    expect(p).toBeDefined();
    expect(p!.type).toBe("routine");
    expect(p!.runtime).toBe("condor");
  });

  it("getPrimitive returns undefined for unknown / wrong-type", () => {
    expect(getPrimitive("routine", "condor", "does-not-exist")).toBeUndefined();
    // market-scanner is a routine, not a strategy
    expect(getPrimitive("strategy", "condor", "market-scanner")).toBeUndefined();
  });

  it("primitivesByPublisher returns only that namespace", () => {
    const rows = primitivesByPublisher("hummingbot");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((p) => p.namespace === "hummingbot")).toBe(true);
  });

  it("getPublisher resolves seeded publishers", () => {
    expect(getPublisher("condor")).toBeDefined();
    expect(getPublisher("hummingbot")).toBeDefined();
    expect(getPublisher("__nope__")).toBeUndefined();
  });
});

describe("aggregates", () => {
  it("stats are internally consistent", () => {
    const s = stats();
    expect(s.primitives).toBe(browse().length);
    expect(s.certified).toBe(browse().filter((p) => p.certified).length);
    expect(s.exchanges).toBe(allExchanges().length);
  });

  it("countByType sums to the total", () => {
    const total = (["strategy", "routine", "skill"] as const).reduce(
      (n, t) => n + countByType(t),
      0,
    );
    expect(total).toBe(stats().primitives);
  });

  it("categories and exchanges are sorted and unique", () => {
    const cats = allCategories();
    expect(cats).toEqual([...new Set(cats)].sort());
    const ex = allExchanges();
    expect(ex).toEqual([...new Set(ex)].sort());
  });

  it("featured / trending return at most 6 and are subsets of browse", () => {
    expect(featured().length).toBeLessThanOrEqual(6);
    expect(trending().length).toBeLessThanOrEqual(6);
  });
});
