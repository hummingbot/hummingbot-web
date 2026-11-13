import { describe, expect, it } from "vitest";
import { fileToRoute, resolveDocUrl, toMarkdown } from "./docs";

describe("fileToRoute", () => {
  it("maps mkdocs files to /docs routes", () => {
    expect(fileToRoute("docs/index.md")).toBe("/docs");
    expect(fileToRoute("installation/index.md")).toBe("/docs/installation");
    expect(fileToRoute("installation/condor.md")).toBe("/docs/installation/condor");
  });
});

describe("resolveDocUrl", () => {
  it("resolves relative page links against the source file", () => {
    expect(resolveDocUrl("installation/condor.md", "../hummingbot-api/index.md")).toBe("/docs/hummingbot-api");
    expect(resolveDocUrl("installation/condor.md", "../client/installation.md#docker")).toBe(
      "/docs/client/installation#docker",
    );
  });

  it("serves images from the docs assets route", () => {
    expect(resolveDocUrl("strategies/v1-strategies/hedge.md", "../../assets/img/a.png")).toBe(
      "/docs-assets/assets/img/a.png",
    );
    expect(resolveDocUrl("faq.md", "/assets/img/b.png")).toBe("/docs-assets/assets/img/b.png");
  });

  it("leaves external, anchor, and escaping links alone", () => {
    expect(resolveDocUrl("faq.md", "https://example.com/x.md")).toBe("https://example.com/x.md");
    expect(resolveDocUrl("faq.md", "#top")).toBe("#top");
    expect(resolveDocUrl("faq.md", "../../etc/passwd")).toBe("../../etc/passwd");
  });
});

describe("toMarkdown", () => {
  it("turns admonitions into HTML blocks with a title", () => {
    const out = toMarkdown('!!! tip "Use paper trading"\n    Try it first.\n\nAfter.');
    expect(out).toContain('<div class="admonition admonition-tip">');
    expect(out).toContain('<p class="admonition-title">Use paper trading</p>');
    expect(out).toContain("Try it first.");
    expect(out).toContain("After.");
  });

  it("accepts bare titles and keeps list indentation", () => {
    const out = toMarkdown("1. Step\n\n    !!! note Heads up\n        Nested.\n");
    expect(out).toContain('    <div class="admonition admonition-note">');
    expect(out).toContain("Heads up");
    expect(out).toContain("    Nested.");
  });

  it("labels tab groups", () => {
    const out = toMarkdown('=== "macOS"\n    brew\n\n=== "Linux"\n    apt\n');
    expect(out).toContain('<p class="tabbed-label">macOS</p>');
    expect(out).toContain('<p class="tabbed-label">Linux</p>');
  });

  it("leaves code fences untouched", () => {
    const src = '```\n!!! note "not an admonition"\n```';
    expect(toMarkdown(src)).toBe(src);
  });

  it("links mkdocs site-path autolinks but leaves closing tags alone", () => {
    expect(toMarkdown("Bylaws: </bylaws.pdf>.")).toBe("Bylaws: [/bylaws.pdf](/bylaws.pdf).");
    expect(toMarkdown("</div>")).toBe("</div>");
  });

  it("strips attr lists and icon shortcodes", () => {
    expect(toMarkdown("[:material-arrow-right: Go](x){ .md-button }")).toBe("[Go](x)");
  });
});
