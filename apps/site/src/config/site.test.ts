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

  it("has a flat nav of the essential sections", () => {
    expect(nav.map((i) => i.label)).toEqual(["Strategies", "Botcamp", "Hackathons", "Docs", "Bounties", "Foundation"]);
    expect(nav.every((i) => !i.children?.length)).toBe(true);
  });

  it("keeps every section on this site", () => {
    expect(nav.every((i) => i.href.startsWith("/") && !i.external)).toBe(true);
  });

});
