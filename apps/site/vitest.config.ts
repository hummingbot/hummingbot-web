import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// "@/*" -> "src/*" alias to match tsconfig. Node environment; volumes.ts reads
// the vendored CSVs via process.cwd() = app dir, so tests run against real data.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Throws outside a Server Component build; tests import server modules directly.
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
