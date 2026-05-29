import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// "@/*" -> "src/*" alias to match tsconfig. Node environment; volumes.ts reads
// the vendored CSVs via process.cwd() = app dir, so tests run against real data.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
