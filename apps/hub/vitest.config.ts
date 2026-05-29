import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirror the tsconfig "@/*" -> "src/*" alias so tests import the same way the
// app does. Node environment: these are pure-logic + data-integrity tests
// (no DOM); detail pages read bundled source via process.cwd() = app dir.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
