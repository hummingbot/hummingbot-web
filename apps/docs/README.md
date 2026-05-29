# @hummingbot/docs

Hummingbot documentation, blog, and release notes (`docs.hummingbot.org`), built
with [Mintlify](https://mintlify.com). Part of the `hummingbot-web` Turborepo —
Mintlify deploys this directory natively via its GitHub app (monorepo path
`/apps/docs`).

## Structure

```
apps/docs/
├── docs.json            # Mintlify config: nav tabs, theme, OpenAPI
├── introduction.mdx     # Condor tab landing
├── documentation/       # Documentation tab (client, gateway, strategies, …)
├── exchanges/           # Exchanges tab (CEX/DEX connectors + gateway/ DEXs)
├── blog/                # Blog tab — posts + release notes (hummingbot-v*.mdx)
├── podcast/             # Podcast tab
├── api-reference/       # Hummingbot API tab (openapi.json)
├── openapi-sources/     # Raw specs from source servers
├── scripts/             # OpenAPI generation scripts
├── images/  logo/       # Assets
```

## Develop

Install the Mintlify CLI once (`npm i -g mintlify`), then run on a non-3000 port
so it doesn't clash with the site (3101) / Hub (3102):

```bash
mintlify dev --port 3103 --no-open
```

Run it from `apps/docs` (the directory containing `docs.json`).

## OpenAPI spec

The Hummingbot API tab is generated from `api-reference/openapi.json`. To refresh
it from a running API server:

```bash
cd ~/hummingbot-api && make run     # localhost:8000
./scripts/generate-openapi.sh       # from apps/docs
```

Commit both `openapi-sources/hummingbot-api.json` and `api-reference/openapi.json`.

## Publishing

Changes merged to `main` deploy automatically via Mintlify's GitHub integration.
