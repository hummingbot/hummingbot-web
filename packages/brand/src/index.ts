/**
 * Brand asset manifest — single source of truth for logos/marks.
 * Files live in `packages/brand/{logos,marks}` and resolve via the package
 * `exports` map (e.g. `@hummingbot/brand/logos/binance-dark.png`).
 *
 * `dark` = variant for dark backgrounds (this site is dark-first).
 */

export type Logo = {
  name: string;
  /** filename in packages/brand/logos for use on dark backgrounds */
  dark: string;
  /** filename for light backgrounds (falls back to `dark` if absent) */
  light?: string;
  kind: "exchange" | "investor" | "press" | "partner";
};

const logo = (
  name: string,
  base: string,
  kind: Logo["kind"],
  paired = true,
): Logo =>
  paired
    ? { name, kind, dark: `${base}-dark.png`, light: `${base}-light.png` }
    : { name, kind, dark: `${base}.png` };

/** Exchanges / protocols (CLOB + DEX) shown in the "used by" + exchanges grids. */
export const exchanges: Logo[] = [
  logo("Binance", "binance", "exchange"),
  logo("Gate.io", "gate", "exchange"),
  logo("OKX", "okx", "exchange"),
  logo("Hyperliquid", "hyperliquid", "exchange"),
  logo("Derive", "derive", "exchange"),
  logo("dYdX", "dydx", "exchange"),
  logo("KuCoin", "kucoin-logo", "exchange"),
  logo("HTX", "htx-logo", "exchange"),
  logo("XRPL", "xrpl", "exchange"),
  logo("Vega", "vega", "exchange"),
  logo("Ripple", "ripple", "exchange"),
];

/** Investors / institutions / press for the "used by" strip. */
export const backers: Logo[] = [
  logo("1kx", "1kx", "investor"),
  logo("Initialized", "initialized", "investor"),
  logo("Bain Capital", "bain-capital", "investor"),
  logo("Defiance", "defiance", "investor"),
  logo("Avant-garde", "avantgarde", "investor"),
  logo("Outlier", "outlier", "investor"),
  logo("Harvard", "harvard", "press"),
  logo("Decrypt", "decrypt", "press"),
];

export const partners: Logo[] = [...exchanges, ...backers];

/** Brand marks (Hummingbot + Condor), resolve via `@hummingbot/brand/marks/*`. */
export const marks = {
  hummingbotLogo: "logo.svg",
  hummingbotLogoColor: "logo-color.png",
  hummingbotIconDark: "hummingbot-icon-dark.png",
  hummingbotIconLight: "hummingbot-icon-light.png",
  condorDark: "condor-dark.png",
  condorLight: "condor-light.png",
  condorSquare: "condor-logo-square.png",
  favicon: "favicon.ico",
} as const;
