import { describe, expect, it } from "vitest";
import { getPrimitive, type Primitive } from "./registry";
import { loadSources } from "./sources";

describe("loadSources", () => {
  it("returns an empty list when the primitive bundles no files", () => {
    const p = { type: "strategy", namespace: "x", name: "y" } as Primitive;
    expect(loadSources(p)).toEqual([]);
  });

  it("reads bundled source for a first-party routine", () => {
    const p = getPrimitive("routine", "condor", "market-scanner")!;
    const files = loadSources(p);
    expect(files.length).toBe(p.files!.length);
    const f = files[0]!;
    expect(f.name).toBe("market_scanner.py");
    expect(f.lang).toBe("python");
    expect(f.code).toContain("def run");
    // reported line count matches the actual bundled content
    expect(f.code.split("\n").length).toBe(f.lines);
  });

  it("reads multi-file v1 strategy bundles (main + config map)", () => {
    const p = getPrimitive("strategy", "hummingbot", "pure-market-making")!;
    const files = loadSources(p);
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files.some((f) => f.lang === "cython")).toBe(true);
    expect(files.every((f) => f.code.length > 0)).toBe(true);
  });

  it("skips manifest entries whose file is missing on disk", () => {
    const p = {
      type: "routine",
      namespace: "condor",
      name: "market-scanner",
      files: [
        { name: "market_scanner.py", lang: "python", lines: 1 },
        { name: "ghost.py", lang: "python", lines: 1 },
      ],
    } as Primitive;
    const files = loadSources(p);
    expect(files.map((f) => f.name)).toEqual(["market_scanner.py"]);
  });
});
