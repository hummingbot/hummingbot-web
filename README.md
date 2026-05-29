# Hummingbot Web

The Hummingbot web platform — a Turborepo monorepo containing the marketing site, the Hub registry, and the Mintlify docs (which also hosts the blog + release notes). Repositions Hummingbot as **"The open source framework for agentic trading strategies."**

## Structure

```
apps/
  site/   → hummingbot.org      Marketing: home, volumes, about
  hub/    → hub.hummingbot.org  ClawHub-style registry (strategies, routines, agents)
  docs/   → docs.hummingbot.org Mintlify: docs + exchanges + blog/releases
packages/
  brand/   Logos, favicons, OG images
  tokens/  Tailwind v4 @theme design tokens + Satoshi font
  ui/      Shared React component kit (site + hub)
```

Each app is a separate Vercel project (independent deploys). Stack: Next.js 16, React 19, Tailwind v4, TypeScript, npm workspaces.

## Develop

```bash
npm install
npm run dev      # all apps via turbo
npm run build    # all apps
```

See [`PLAN.md`](./PLAN.md) for the full implementation spec.
