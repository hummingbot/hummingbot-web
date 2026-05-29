import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Primitive, SourceFile } from "./registry";
import { PLURAL } from "./types";

/**
 * Reads bundled source files from disk for a primitive's detail page. Source
 * is kept out of registry.json (which is imported wholesale on every page) and
 * loaded on demand here — server components only. Path layout matches what
 * scripts/import-sources.mjs writes.
 */

const ROOT = join(process.cwd(), "src", "content", "sources");

export type LoadedSource = SourceFile & { code: string };

export function loadSources(p: Primitive): LoadedSource[] {
  if (!p.files?.length) return [];
  const dir = join(ROOT, PLURAL[p.type], p.namespace, p.name);
  return p.files
    .map((f) => {
      const path = join(dir, f.name);
      if (!existsSync(path)) return null;
      return { ...f, code: readFileSync(path, "utf8") };
    })
    .filter((x): x is LoadedSource => x !== null);
}
