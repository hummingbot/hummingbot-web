# @hummingbot/site

Marketing site for Hummingbot (`hummingbot.org`) — home, volumes, and about.
Part of the `hummingbot-web` Turborepo; consumes `@hummingbot/brand`,
`@hummingbot/tokens`, and `@hummingbot/ui`.

- **Framework:** Next.js (App Router) + React, Tailwind v4, shadcn/ui
- **Type/display font:** Satoshi (shipped via `@hummingbot/tokens`)

## Develop

Run from the repo root (uses a non-3000 port to avoid clashing with the other apps):

```bash
npm run dev --workspace @hummingbot/site -- --port 3101
```

Then open http://localhost:3101.

The Docs (Mintlify) and Hub live on their own domains in production. Point them
at local instances with env overrides:

```bash
NEXT_PUBLIC_DOCS_URL=http://localhost:3103 \
NEXT_PUBLIC_HUB_URL=http://localhost:3102 \
  npm run dev --workspace @hummingbot/site -- --port 3101
```

## Checks

```bash
npm run typecheck --workspace @hummingbot/site
npm run lint --workspace @hummingbot/site
npm run build --workspace @hummingbot/site
```

## Notes

- Newsletter signup is the Substack embed in `src/components/home/newsletter-discord.tsx`.
- `/install.sh` and `/condor.sh` are 302 vanity redirects to the `deploy` repo
  (see `next.config.ts`).
- GitHub stars / release tags are fetched at build/ISR (`src/lib/github.ts`);
  set `GITHUB_TOKEN` to raise the API rate limit.
