#!/usr/bin/env node
/**
 * Sync canonical brand assets (packages/brand) into a consuming app's
 * public/brand dir. Keeps packages/brand the single source of truth while
 * letting apps serve the files at /brand/*. Run via predev/prebuild.
 *
 * Usage: node scripts/sync-brand.mjs <appDir>   (default: cwd)
 */
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "packages", "brand");
const appDir = resolve(process.argv[2] ?? process.cwd());
const dest = join(appDir, "public", "brand");

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(join(src, "logos"), join(dest, "logos"), { recursive: true });
await cp(join(src, "marks"), join(dest, "marks"), { recursive: true });

console.log(`[sync-brand] ${src} → ${dest}`);
