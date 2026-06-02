import { describe, expect, it } from "vitest";
import { capitalize, DATA_WINDOW_END, formatUsd, getVolumesData } from "./volumes";

describe("formatUsd", () => {
  it("scales to B/M/K with one decimal", () => {
    expect(formatUsd(2.5e9)).toBe("$2.5B");
    expect(formatUsd(3.4e6)).toBe("$3.4M");
    expect(formatUsd(1.2e3)).toBe("$1.2K");
    expect(formatUsd(950)).toBe("$950");
  });
});

describe("capitalize", () => {
  it("title-cases and replaces underscores", () => {
    expect(capitalize("binance_paper_trade")).toBe("Binance Paper Trade");
    expect(capitalize("kucoin")).toBe("Kucoin");
  });
});

describe("getVolumesData", () => {
  const d = getVolumesData();

  it("exposes a fixed window ending at DATA_WINDOW_END", () => {
    expect(d.windowEnd).toBe(DATA_WINDOW_END);
    expect(d.windowStart.localeCompare(d.windowEnd)).toBeLessThan(0);
  });

  it("headline stats are positive and coherent", () => {
    for (const s of [d.lastYear, d.allTime]) {
      expect(s.totalVolume).toBeGreaterThan(0);
      expect(s.avgDailyVolume).toBeGreaterThan(0);
      expect(s.uniqueExchanges).toBeGreaterThan(0);
      expect(s.days).toBeGreaterThan(0);
    }
    // all-time spans at least as much as the trailing year
    expect(d.allTime.totalVolume).toBeGreaterThanOrEqual(d.lastYear.totalVolume);
  });

  it("memoizes (returns the same reference)", () => {
    expect(getVolumesData()).toBe(d);
  });
});
