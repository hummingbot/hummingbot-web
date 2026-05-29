/** Brand accent palette — single source of truth for TS consumers. */
export const brand = {
  teal: "#5FFFD7",
  yellow: "#FCDB17",
  magenta: "#E549FF",
  orange: "#EF8728",
  cyan: "#00C2CE",
} as const;

export const trading = {
  bull: "#22c55e",
  bear: "#ef4444",
} as const;

export type BrandColor = keyof typeof brand;
