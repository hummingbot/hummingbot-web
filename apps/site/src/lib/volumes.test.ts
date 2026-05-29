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

  it("parses the daily series with valid points", () => {
    expect(d.daily.length).toBeGreaterThan(0);
    for (const pt of d.daily) {
      expect(pt.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isFinite(pt.volume)).toBe(true);
    }
  });

  it("ranks top exchanges desc, capped at 25, shares in (0,1]", () => {
    expect(d.topExchanges.length).toBeGreaterThan(0);
    expect(d.topExchanges.length).toBeLessThanOrEqual(25);
    for (let i = 1; i < d.topExchanges.length; i++) {
      expect(d.topExchanges[i - 1]!.volume).toBeGreaterThanOrEqual(d.topExchanges[i]!.volume);
    }
    for (const e of d.topExchanges) {
      expect(e.share).toBeGreaterThan(0);
      expect(e.share).toBeLessThanOrEqual(1);
    }
  });

  it("ranks top versions desc, capped at 15", () => {
    expect(d.topVersions.length).toBeLessThanOrEqual(15);
    for (let i = 1; i < d.topVersions.length; i++) {
      expect(d.topVersions[i - 1]!.volume).toBeGreaterThanOrEqual(d.topVersions[i]!.volume);
    }
  });

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
