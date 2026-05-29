import type { PrimitiveType } from "./registry";

export const PLURAL: Record<PrimitiveType, string> = {
  strategy: "strategies",
  routine: "routines",
  agent: "agents",
};

const SINGULAR: Record<string, PrimitiveType> = {
  strategies: "strategy",
  routines: "routine",
  agents: "agent",
};

export function toSingular(plural: string): PrimitiveType | null {
  return SINGULAR[plural] ?? null;
}

/** Short label for a strategy/routine subtype, shown as a badge on cards. */
export const SUBTYPE_LABEL: Record<string, string> = {
  script: "Script",
  v1: "V1",
  routine: "Built-in",
};

export const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(iso),
  );
