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
  /** docs Exchanges-tab slug (apps/docs/exchanges/<slug>); omit if no page exists */
  slug?: string;
};

const logo = (
  name: string,
  base: string,
  kind: Logo["kind"],
  paired = true,
  slug?: string,
): Logo => ({
  name,
  kind,
  ...(paired
    ? { dark: `${base}-dark.png`, light: `${base}-light.png` }
    : { dark: `${base}.png` }),
  ...(slug ? { slug } : {}),
});

/**
 * Exchanges / protocols (CLOB + DEX) shown in the "used by" + exchanges grids.
 * `slug` deep-links each logo into the docs Exchanges tab; Vega/Ripple have no
 * dedicated connector page yet, so they fall back to the exchanges index.
 */
export const exchanges: Logo[] = [
  logo("Binance", "binance", "exchange", true, "binance"),
  logo("Gate.io", "gate", "exchange", true, "gate-io"),
  logo("OKX", "okx", "exchange", true, "okx"),
  logo("Hyperliquid", "hyperliquid", "exchange", true, "hyperliquid"),
  logo("Derive", "derive", "exchange", true, "derive"),
  logo("dYdX", "dydx", "exchange", true, "dydx"),
  logo("KuCoin", "kucoin-logo", "exchange", true, "kucoin"),
  logo("HTX", "htx-logo", "exchange", true, "htx"),
  logo("XRPL", "xrpl", "exchange", true, "xrpl"),
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
