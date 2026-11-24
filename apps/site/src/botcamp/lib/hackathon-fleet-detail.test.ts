import { describe, it, expect } from "vitest"
import { closeTypeName, isFailedClose, lpPairLabel, matchMintTickers, mergeTradedPairs, recordsPnl, swapQuoteVolume } from "./hackathon-fleet-detail"

describe("swapQuoteVolume", () => {
  it("counts the quote a sell returns and the quote a buy spends", () => {
    // Sold 0.078 SOL for 9.0555 USDC; spent 6.0277 USDC for 0.0525 SOL.
    expect(swapQuoteVolume("SELL", 0.078, 9.0555)).toBe(9.0555)
    expect(swapQuoteVolume("BUY", 6.0277, 0.0525)).toBe(6.0277)
  })

  it("throws on a side it does not know", () => {
    expect(() => swapQuoteVolume("HOLD", 1, 1)).toThrow("Unknown swap side: HOLD")
  })
})

describe("matchMintTickers", () => {
  const breakevens = [
    { ticker: "SPCXx", price: 169.5 },
    { ticker: "PLTRx", price: 198 },
  ]

  it("names an unknown mint after the pair whose price is within 3%", () => {
    const matched = matchMintTickers([{ base: "Xs3oZ", entry: 169.27 }], breakevens)
    expect(matched.get("Xs3oZ")).toBe("SPCXx")
  })

  it("leaves a mint unmatched when no pair is that close, rather than guessing", () => {
    // 1214 is nowhere near 169.5 or 198.
    expect(matchMintTickers([{ base: "A7bdi", entry: 1214 }], breakevens).size).toBe(0)
  })

  it("does not rename a mint that already has a ticker", () => {
    const sol = "So11111111111111111111111111111111111111112"
    expect(matchMintTickers([{ base: sol, entry: 169.5 }], breakevens).size).toBe(0)
  })
})

describe("lpPairLabel", () => {
  it("falls back to a short address for a mint nothing matched", () => {
    const label = lpPairLabel("A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", new Map())
    expect(label).toBe("A7bd…QXaS-USDC")
  })
})

describe("mergeTradedPairs", () => {
  it("sums executor P&L per pair and leaves it blank where only swaps traded", () => {
    const rows = mergeTradedPairs(
      [],
      [
        { venue: "bitget_perpetual", pair: "DOGE-USDT", volume: 100, fees: 1, pnl: 2 },
        { venue: "bitget_perpetual", pair: "DOGE-USDT", volume: 50, fees: 0.5, pnl: -0.5 },
        { venue: "jupiter", pair: "SOL-USDC", volume: 9, fees: 0, pnl: null },
      ],
    )
    expect(rows).toEqual([
      { venue: "bitget_perpetual", pair: "DOGE-USDT", source: "executors", volume: 150, fees: 1.5, realized: 1.5, unrealized: null },
      { venue: "jupiter", pair: "SOL-USDC", source: "executors", volume: 9, fees: 0, realized: null, unrealized: null },
    ])
  })

  it("lists controller pairs with their own realized and unrealized P&L, biggest volume first", () => {
    const rows = mergeTradedPairs(
      [
        { venue: "gate_io", pair: "FIL-USDT", volume: 21563, fees: 8.63, realized: -6.97, unrealized: 1.77 },
        { venue: "gate_io", pair: "INJ-USDT", volume: 18626, fees: 7.45, realized: -4.95, unrealized: -0.91 },
      ],
      [{ venue: "gate_io", pair: "ZRO-USDT", volume: 30000, fees: 1, pnl: 0.2 }],
    )
    expect(rows.map((r) => [r.pair, r.source])).toEqual([
      ["ZRO-USDT", "executors"],
      ["FIL-USDT", "controller"],
      ["INJ-USDT", "controller"],
    ])
  })
})

describe("close types", () => {
  it("names the codes a bot database stores, and throws on one it does not know", () => {
    expect(closeTypeName(5)).toBe("EARLY_STOP")
    expect(closeTypeName(10)).toBe("POSITION_HOLD")
    expect(() => closeTypeName(99)).toThrow("Unknown executor close type: 99")
  })

  it("counts an executor that lacked the balance to place its order as failed, and a held position as not", () => {
    expect(isFailedClose("FAILED")).toBe(true)
    expect(isFailedClose("INSUFFICIENT_BALANCE")).toBe(true)
    expect(isFailedClose("POSITION_HOLD")).toBe(false)
    expect(isFailedClose("EARLY_STOP")).toBe(false)
  })
})

describe("recordsPnl", () => {
  it("is true only for the executors that book their own P&L", () => {
    expect(recordsPnl("position_executor")).toBe(true)
    expect(recordsPnl("lp_executor")).toBe(true)
    expect(recordsPnl("order_executor")).toBe(false)
    expect(recordsPnl("swap")).toBe(false)
  })
})
