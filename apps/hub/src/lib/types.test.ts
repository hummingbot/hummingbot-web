import { describe, expect, it } from "vitest";
import { fmtDate, fmtNum, PLURAL, SUBTYPE_LABEL, toSingular } from "./types";

describe("PLURAL / toSingular", () => {
  it("round-trips every primitive type", () => {
    for (const t of ["strategy", "routine", "agent"] as const) {
      expect(toSingular(PLURAL[t])).toBe(t);
    }
  });
  it("returns null for an unknown plural", () => {
    expect(toSingular("widgets")).toBeNull();
  });
});

describe("SUBTYPE_LABEL", () => {
  it("labels the known subtypes", () => {
    expect(SUBTYPE_LABEL.script).toBe("Script");
    expect(SUBTYPE_LABEL.v1).toBe("V1");
    expect(SUBTYPE_LABEL.routine).toBe("Built-in");
  });
});

describe("fmtNum", () => {
  it("uses compact notation", () => {
    expect(fmtNum(1500)).toBe("1.5K");
    expect(fmtNum(2_300_000)).toBe("2.3M");
    expect(fmtNum(42)).toBe("42");
  });
});

describe("fmtDate", () => {
  it("formats ISO dates as 'Mon D, YYYY'", () => {
    expect(fmtDate("2026-05-29")).toBe("May 29, 2026");
  });
});
