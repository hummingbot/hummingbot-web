// Split out of strategy-access.ts so client components can read the prices
// without pulling Prisma into the browser bundle (Turbopack doesn't tree-shake
// it away the way Botcamp's webpack build does).
export const STRATEGY_UNLOCK_PRICE_CENTS = 5000

export const STRATEGY_UNLOCK_DURATION_DAYS = 365
