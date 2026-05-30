import { describe, expect, it } from "vitest";
import { announcement, githubOrg, nav, urls } from "./site";

describe("site config", () => {
  it("exposes absolute external urls and a github org", () => {
    expect(githubOrg).toBeTruthy();
    expect(urls.github).toMatch(/^https:\/\/github\.com\//);
    expect(urls.discord).toMatch(/^https?:\/\//);
    expect(urls.docs).toMatch(/^https?:\/\//);
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

  it("has a Hub menu covering all three primitive types", () => {
    const hub = nav.find((i) => i.label === "Hub");
    expect(hub?.children?.map((c) => c.label)).toEqual(["Strategies", "Routines", "Skills"]);
  });

  it("announcement has display text and a link", () => {
    expect(announcement.text).toBeTruthy();
    expect(announcement.href).toMatch(/^https?:\/\//);
  });
});
