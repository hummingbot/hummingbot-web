/** Shared MDX sanitizers for the mkdocs → Mintlify migrations. */

/**
 * Convert mkdocs admonition blocks (`!!! note "Title"` + 4-space-indented body)
 * into valid Markdown blockquotes. Avoids unclosed-JSX issues from naive
 * `<Note>` conversion. Returns valid MDX-safe markdown.
 */
export function convertAdmonitions(src) {
  const lines = src.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:!!!|\?\?\?\+?)\s+(\w+)\s*(?:"([^"]*)")?\s*$/);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    const title = m[2] || m[1].replace(/^\w/, (c) => c.toUpperCase());
    out.push(`> **${title}**`);
    out.push(">");
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === "") {
        const next = lines[i + 1] ?? "";
        if (/^( {4}|\t)/.test(next)) {
          out.push(">");
          i++;
          continue;
        }
        break;
      }
      if (/^( {4}|\t)/.test(l)) {
        out.push("> " + l.replace(/^( {4}|\t)/, ""));
        i++;
        continue;
      }
      break;
    }
    i--; // for-loop will re-increment
  }
  return out.join("\n");
}

/**
 * Remove all images/GIFs (the new site doesn't use migrated media): markdown
 * images, linked images, and raw <img> tags.
 */
export function stripImages(src) {
  return src
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "") // linked image [![..](..)](..)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // ![alt](url)
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, "") // ![alt][ref]
    .replace(/!\[[^\]]*\]/g, "") // ![alt] (bare/reference)
    .replace(/<img[^>]*\/?>/gi, "")
    .replace(/\n{3,}/g, "\n\n");
}

/** Strip the `.md` (and optional #anchor) from internal markdown links. */
export function stripMdLinks(src) {
  return src.replace(/\]\(([^)]+?)\.md(#[^)]*)?\)/g, (_m, p, anchor) => `](${p}${anchor ?? ""})`);
}

/**
 * Make markdown MDX-safe outside code spans/fences:
 *  - strip HTML comments (`<!-- -->` is invalid in MDX)
 *  - convert autolinks `<https://…>` → `[url](url)`
 *  - neutralize stray `<` (JSX trigger: `<your-key>`, `</foo`, `< 5`) → `&lt;`
 *  - escape `{`/`}` (JS expression trigger)
 * `>` is left intact so markdown blockquotes keep working.
 */
export function escapeForMdx(src) {
  const parts = src.split(/(```[\s\S]*?```|`[^`]*`)/g);
  return parts
    .map((seg, i) => {
      if (i % 2 === 1) return seg; // inside code — leave untouched
      return seg
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<((?:https?:\/\/)[^>\s]+)>/g, "[$1]($1)")
        .replace(/</g, "&lt;")
        .replace(/\{/g, "\\{")
        .replace(/\}/g, "\\}");
    })
    .join("");
}
