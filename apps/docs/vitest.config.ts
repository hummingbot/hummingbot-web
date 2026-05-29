import { defineConfig } from "vitest/config";

// Docs is content (MDX + docs.json), not a build target — these tests validate
// structure: navigation integrity, frontmatter, links, and referenced assets.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
