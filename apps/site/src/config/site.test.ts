import { describe, expect, it } from "vitest";
import { githubOrg, nav, urls } from "./site";

describe("site config", () => {
  it("exposes absolute external urls and a github org", () => {
    expect(githubOrg).toBeTruthy();
    expect(urls.github).toMatch(/^https:\/\/github\.com\//);
    expect(urls.discord).toMatch(/^https?:\/\//);
    expect(urls.docs).toBe("/docs");
  });

  it("has a non-empty nav; internal items are root-relative, external are absolute", () => {
    expect(nav.length).toBeGreaterThan(0);
    for (const item of nav) {
      expect(item.label).toBeTruthy();
      if (item.external) expect(item.href).toMatch(/^https?:\/\//);
      else expect(item.href.startsWith("/") || item.href.startsWith("#")).toBe(true);
      for (const child of item.children ?? []) {
        expect(child.label).toBeTruthy();
        expect(child.href).toBeTruthy();
      }
    }
  });

  it("names tasks, not internal brands, at the top level", () => {
    expect(nav.map((i) => i.label)).toEqual(["Products", "Strategies", "Learn", "Hackathons", "Docs", "Community"]);
    // Botcamp lives under Learn.
    expect(nav.find((i) => i.label === "Learn")?.children?.[0]?.label).toBe("Botcamp");
  });

  it("keeps every section on this site", () => {
    expect(nav.every((i) => i.href.startsWith("/") && !i.external)).toBe(true);
    for (const item of nav) for (const child of item.children ?? []) expect(child.href.startsWith("/")).toBe(true);
  });

});
