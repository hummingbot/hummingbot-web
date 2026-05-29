# @hummingbot/hub

The Hummingbot Hub registry (`hub.hummingbot.org`) — browse Strategies,
Routines, and Agents. Part of the `hummingbot-web` Turborepo; consumes
`@hummingbot/brand`, `@hummingbot/tokens`, and `@hummingbot/ui`.

- **Framework:** Next.js (App Router) + React, Tailwind v4, shadcn/ui

> **Status:** v1 is a **static, seed-backed prototype** — `src/lib/registry.ts`
> reads seed JSON, not a live database. The Prisma/Neon schema
> (`prisma/schema.prisma`), GitHub OAuth, publish/install API route handlers,
> and the owner dashboard are production targets and are **not wired yet**.

## Develop

Run from the repo root (non-3000 port to avoid clashing with the other apps):

```bash
npm run dev --workspace @hummingbot/hub -- --port 3102
```

Then open http://localhost:3102.

## Checks

```bash
npm run typecheck --workspace @hummingbot/hub
npm run lint --workspace @hummingbot/hub
npm run build --workspace @hummingbot/hub
```
