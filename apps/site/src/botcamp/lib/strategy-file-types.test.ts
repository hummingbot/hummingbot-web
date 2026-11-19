/**
 * What a builder may attach to a strategy. The risk: a strategy page becoming
 * a place to host .html/.svg/.php for others to download — the 2026-10-29
 * probe uploaded all three — while every kind of file strategies on prod
 * actually carry keeps working.
 */

import { describe, it, expect } from "vitest"
import { strategyFileContentType } from "./strategy-file-types"

describe("strategyFileContentType", () => {
  it.each([
    ["controllers/generic/pmm.py", "text/plain; charset=utf-8"],
    ["README.md", "text/plain; charset=utf-8"],
    ["conf/config.yml", "text/plain; charset=utf-8"],
    ["notebook.ipynb", "text/plain; charset=utf-8"],
    ["src/lib.rs", "text/plain; charset=utf-8"],
    ["fix.patch", "text/plain; charset=utf-8"],
    ["LICENSE", "text/plain; charset=utf-8"],
    ["LICENSE (1)", "text/plain; charset=utf-8"],
    ["bundle.zip", "application/zip"],
  ])("accepts %s as %s", (name, type) => {
    expect(strategyFileContentType(name)).toBe(type)
  })

  it.each(["probe.html", "probe.svg", "probe.php", "setup.exe", "cached.pyc", "notes.py.html", "pullback_kc_v1pythonfile"])(
    "refuses %s",
    (name) => {
      expect(strategyFileContentType(name)).toBeNull()
    },
  )
})
