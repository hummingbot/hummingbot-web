# Hummingbot Website Revamp — Plan (v1, for feedback)

> Status: **Draft for review.** Nothing is built yet. Reference aesthetic: [bun.sh](https://bun.sh) — dark, bold, big type, install command front-and-center, fast and playful.

## 1. Vision

Replace the current mkdocs site (`~/hummingbot-site`) with a modern web app, repositioning Hummingbot as **"The open source framework for agentic trading strategies."** Delivered as a **Turborepo monorepo** (§2) with three apps — marketing **site**, the **Hub** registry, and Mintlify **docs** (which also hosts the **blog + release notes**) — sharing one brand/token/UI layer, plus external destinations (Botcamp, XRPLiquid). bun.sh is the aesthetic north star.

## 2. Architecture: one Turborepo monorepo, three apps (✅ solo-maintainer-friendly)

**One repo** holds three apps + shared packages; each app is a **separate Vercel project / deploy** (independent domains, env, build triggers via `turbo-ignore`) so a marketing change never rebuilds the Hub. Single source of truth for logos, tokens, and components — no published packages, no asset drift.

```
hummingbot/  (Turborepo, npm workspaces)
├─ apps/
│  ├─ site/   → hummingbot.org      (marketing: home, volumes, about, install vanity routes)
│  ├─ hub/    → hub.hummingbot.org  (ClawHub-style registry: UI + API + Prisma/Neon + OAuth + jobs)
│  └─ docs/   → docs.hummingbot.org (Mintlify; tabs: Documentation, Condor, Hummingbot API, Exchanges, Blog, Podcast)
├─ packages/
│  ├─ brand/   logos, favicons, OG images        (site+hub import; docs references files)
│  ├─ tokens/  design tokens as CSS @theme + TS   (one source of truth — §3.1)
│  └─ ui/      React component kit (button, card, nav, footer, code block…)  (site + hub only)
└─ turbo.json, package.json
```

| Nav item | Where | Notes |
|---|---|---|
| **Home** | `apps/site` | New build |
| **Docs** | `apps/docs` (Mintlify) | `~/condor-docs` + new Hummingbot sections. Six tabs: **Documentation, Condor, Hummingbot API, Exchanges, Blog, Podcast.** |
| **Hub** | `apps/hub` | ClawHub-style registry; own deploy + DB. Linked from nav. |
| **Education** | external ↗ | → Botcamp |
| **Rewards** | external ↗ | → XRPLiquid |
| **Blog + Releases** | `apps/docs` (Mintlify) | Unified MDX store (103 posts + 48 release notes), Mintlify search — §8 |
| **Volumes** (`/volumes`) | `apps/site` | Rebuild [`hummingbot/datadog`](https://github.com/hummingbot/datadog) natively |
| **About** | `apps/site` | Foundation, Bounties, HBOT, Governance |

So `apps/site` hosts: **Home, Volumes, About** (+ redirects). Docs **and** Blog/Releases both live in `apps/docs` (Mintlify); the Hub is `apps/hub`.

**Sharing model:**
- **Logos/brand** → `packages/brand` (site+hub import directly; docs references the files). One place, no drift.
- **Design tokens** → `packages/tokens` exports the `@theme` CSS + TS constants both Next apps import; docs mirrors the colors in `docs.json`/custom CSS.
- **UI kit** → `packages/ui` (site + hub). Docs (Mintlify) can't consume React components — and doesn't need to.
- **Hub API types** live inside `apps/hub` and are imported by its own UI. The marketing site & Botcamp call the Hub API directly and type the small response surface inline. **No shared types package.**
- **CLI** (later) — install/publish in the Python `condor`/`hummingbot` repos, consuming the Hub's HTTP API; Python models generated from the OpenAPI doc the Hub emits.

**Deploy:** each `apps/*` = its own Vercel project (Root Directory = the app dir) with an Ignored Build Step so deploys stay independent. **Mintlify deploys `apps/docs` natively from the monorepo** — in the Mintlify dashboard → **Git Settings → "Set up as monorepo"** toggle → set path to `/apps/docs` (no trailing slash; that dir must contain a valid `docs.json`). [Confirmed supported.](https://www.mintlify.com/docs/deploy/monorepo)

> **Monorepo root (decided):** we build **in place at `~/hummingbot-site-v2`** — it becomes the Turborepo root, with marketing content under `apps/site`. No new directory.

## 3. Tech stack (proposed)

Aligned with `~/botcamp-site`'s stack so the **data patterns and tokens** carry over (the *components* are rebuilt clean):

- **Next.js 16 (App Router, Turbopack) + React 19** — current `create-next-app` default (Botcamp is on 15; new apps scaffold on 16).
- **TypeScript**.
- **Tailwind CSS v4 + shadcn/ui** ✅ (decided) — CSS-first `@theme inline` config (use the `tailwind-v4-shadcn` skill for the four-step setup). We **redesign all components from scratch** in a clean, modern bun.sh-inspired style rather than lifting Botcamp's v3 components 1:1.
- **Shared Hummingbot Design System tokens** defined in Botcamp's `globals.css` (`--hb-teal #5FFFD7`, `--hb-yellow #FCDB17`, `--hb-magenta #E549FF`, `--hb-orange #EF8728`, `--hb-cyan #00C2CE`, full ink scale, bull/bear semantics). We **port the token values into the v4 `@theme`** (in `packages/tokens`) so brand colors stay consistent across Hummingbot / Condor / Botcamp — but the component layer is new.
- **MDX** for the unified blog + release notes (§8 — 103 posts + 48 release notes).
- **Deploy on Vercel.**
- **Runtime / package manager: npm** ✅ (decided) — matches Botcamp; bun.sh is an *aesthetic* reference only, not a tooling mandate.

> **What we reuse from Botcamp** is now narrower: the **design tokens** (ported to v4), the **data model & data-fetching patterns** (Prisma schema, ISR), and **UX patterns** (Hub filter sidebar behavior) — *not* the literal component markup, which we rebuild clean.

**Design QA:** install the Vercel **web-design-guidelines** skill (already downloaded) and run it against every component before merge — enforces a11y, focus states, typography (curly quotes, `…`, tabular-nums), reduced-motion, CLS-safe images, URL-synced filter state, etc.

### 3.1 Design system spec (implementation-ready)

> Lives in **`packages/tokens`** (CSS `@theme` + TS constants) and **`packages/ui`** (components), shared by `apps/site` + `apps/hub`; `apps/docs` mirrors the colors in `docs.json`. Logos/OG in **`packages/brand`**.

- **Theme:** dark-first (like bun.sh). `color-scheme: dark` on `<html>`, `<meta name="theme-color">` = page bg. Light theme is a follow-up toggle, not v1-blocking.
- **Tailwind v4 `@theme`** maps the ported Hummingbot tokens to utilities:
  - Accents: `--color-brand-teal #5FFFD7`, `--color-brand-yellow #FCDB17`, `--color-brand-magenta #E549FF`, `--color-brand-orange #EF8728`, `--color-brand-cyan #00C2CE`.
  - Surfaces (dark): bg `--ink-999/950`, card `--ink-900/850`, border `--ink-800`, muted text `--ink-400/500`. Trading semantics `--bull #22c55e` / `--bear #ef4444`.
  - Radii (`--radius-*` 4→16px), shadows (`--shadow-*`), all from Botcamp's token set.
- **Typography:** **Satoshi** (display/sans, reused from Botcamp — `packages/tokens` ships the font files + `@font-face`); **mono** for code/install/repo names (the bun.sh accent move). `GradientText` for hero/section headings. `text-balance` on headings; `tabular-nums` on all metrics.
- **Layout primitives:** `<Section>` (consistent vertical rhythm + max-width container), 12-col grid, generous whitespace, full-bleed dark sections. `overflow-x-hidden` guards; `env(safe-area-inset-*)` on full-bleed.
- **Motion:** transform/opacity only, no `transition: all`, every animation has a `prefers-reduced-motion` path (marquees freeze, gradients stop).
- **shadcn/ui** for accessible primitives (Tabs, Dialog, DropdownMenu, Tooltip, Checkbox, Select) — restyled to the dark brand, not default.

## 4. Information architecture (top nav)

```
Logo   Home   Docs ↗   Hub ▾   Volumes   Blog ↗   About ▾    [Education ↗] [Rewards ↗] [GitHub] [Discord]
                          │                            │
                          ├ Strategies                 ├ Foundation
                          ├ Routines                   ├ Bounties
                          └ Agents                      ├ HBOT
                                                        └ Governance
```

- **Docs ↗** → `docs.hummingbot.org` (Mintlify) — six tabs: **Documentation, Condor, Hummingbot API, Exchanges, Blog, Podcast**.
- **Blog ↗** → `docs.hummingbot.org/blog` (Mintlify), with a **Releases** group; both Docs and Blog point into the same Mintlify app.
- **Hub ▾** → `hub.hummingbot.org` (Strategies / Routines / Agents browse views).
- **Education** and **Rewards** are external `↗` redirects.
- Sticky header, dark-first. Marketing nav lives in `apps/site`; Docs/Blog and Hub are linked-out apps.

## 5. Home page — detailed section spec

Modeled closely on [bun.sh](https://bun.sh): a dark, dense, scroll-driven single page where each section earns its place. bun.sh order for reference: announcement bar → nav → hero+install → "used by" logos → benchmark moments → "four tools" card grid → "who uses" → comparison matrix → **"everything you need" category grid** → code-sample carousel → **"Developers love Bun" tweet marquee** → "learn more" → footer. Our adaptation below, top to bottom. Each item lists the **component(s)** to build and the **data source**.

> **Section order:** `0` AnnouncementBar → `1` Hero+Install → `2` UsedBy logos → `3` What you can build → `4` **Ecosystem repos grid** → `5` Volumes → `6` Exchanges → `7` **"Market Makers love Hummingbot" marquee** → `8` Newsletter+Discord → `9` Footer.

### 5.0 Announcement bar — `<AnnouncementBar>`
Slim dismissible bar above the nav (bun.sh: *"Bun is joining Anthropic →"*). Single line, centered, accent left-border or gradient underline, `↗`/`→` affordance, dismiss `✕` persisted to `localStorage`.
- **Content:** editable single entry (text + href) from a small config (`/config/announcement.ts`). **Use the current site's banner:** *"**Introducing Condor 🦅** — The Open Source Harness for Trading Agents ➡️"*, linking to the Condor intro blog post (`docs.hummingbot.org/blog/introducing-condor`).
- **A11y:** `role="region" aria-label="Announcement"`; dismiss is a real `<button aria-label="Dismiss announcement">`; height collapses without layout shift (animate `height`/`opacity`, honor `prefers-reduced-motion`).

### 5.1 Hero + install — `<Hero>`, `<InstallCommand>`
- **H1:** "The open source framework for agentic trading strategies" (`text-balance`, large display weight, brand-gradient on key words using `--hb-teal`/`--hb-magenta`).
- **Subhead:** one sentence positioning (open source, self-hosted, multi-exchange, AI-native).
- **Install block** — the bun.sh signature move. Two tabbed copy-to-clipboard commands, served from **clean vanity URLs** (OpenClaw's `curl -fsSL https://openclaw.ai/install.sh | bash` pattern) instead of raw GitHub paths:
  - **Hummingbot:** `curl -fsSL https://hummingbot.org/install.sh | bash`
  - **Condor:** `curl -fsSL https://hummingbot.org/condor.sh | bash`
  - **How the vanity URLs work:** `apps/site` serves `/install.sh` and `/condor.sh` as routes that **302-redirect to the real scripts in the `deploy` repo** (Condor already has `deploy/main/setup.sh`; the **new `deploy/main/install.sh` for the Hummingbot client is created in the `deploy` repo**, modeled on Condor's `setup.sh` + OpenClaw's OS/arch detection — that script work is a `deploy`-repo task, outside this monorepo).
  - `<InstallCommand>`: mono block, leading `$`, copy button with "Copied ✓" + `aria-live="polite"`, tabs are real tablist (`role="tab"`/`aria-selected`), version pill ("Install Condor v…", fetched from latest GitHub release — dynamic, not hardcoded).
- **CTAs:** primary "Get Started" → Docs; secondary "Star on GitHub" `<GitHubStars>` with live star count (GitHub API at build/ISR).
- **Background:** subtle animated brand gradient (compositor-friendly `transform`/`opacity` only; disabled under reduced-motion).

### 5.2 "Used by" logo strip — `<LogoMarquee variant="static">`
bun.sh's "USED BY" row. Grayscale partner/exchange/institution logos, hover→color. Logos come from `packages/brand` (sourced from `~/hummingbot-site/docs/assets/logos`).

### 5.3 What you can build — `<BuildCards>`
Three cards: **Strategies / Routines / Agents**, each → its Hub browse view (§6.3). Icon, title, one-liner, item count (live from registry), mini install hint. Clean card with `hover:` lift + `focus-visible` ring. Grid: 3-col desktop / 1-col mobile.

### 5.4 Ecosystem repos grid — `<EcosystemGrid>` *(NEW — models bun.sh "Everything you need to build & ship")*
bun.sh's 6-category grid where each category is an icon+title header over a list of monospace items (`Bun.serve()` + description + `›` chevron). **We use it to show off the whole Hummingbot GitHub org.**
- **Section heading:** "Everything you need to run a trading operation" · subhead "One open-source ecosystem — from core engine to AI agents."
- **Layout:** responsive grid, **3 columns × 2 rows** of category cards (bun.sh uses 6 categories); each card = `<RepoCategoryCard>` with header (`<Icon>` + Title) and 3× `<RepoLink>` rows.
- **`<RepoLink>` row:** `repo-name` in **mono accent** + one-line description (muted) + right-aligned `›` chevron; whole row is an `<a>` to the GitHub repo (so Cmd/middle-click works); `hover:` raises contrast.
- **Data — dynamic (no hardcoding per project rules):** fetch the org's repos from the **GitHub API at build time** (ISR/revalidate daily) for live `description` + `stars`; the *grouping + ordering* lives in a small `/config/ecosystem.ts` map. Archived repos (e.g. `larp`) excluded.
- **Proposed 6 categories (18 repos):**

  | Category (icon) | Repos (mono name — desc) |
  |---|---|
  | **Core Trading** (engine) | `hummingbot` — trading-bot framework · `gateway` — DEX connectivity middleware · `hummingbot-api` — orchestrate multiple bots |
  | **AI Agents** (robot) | `condor` — AI trading-agent harness · `mcp` — Model Context Protocol server · `skills` — reusable agent skills |
  | **Research & Backtesting** (flask) | `quants-lab` — quant research toolkit · `dashboard` — backtest, deploy & manage · `bot-battle` — strategy competition |
  | **Deploy & Ops** (rocket) | `deploy` — Docker deployment · `brokers` — message-broker layer · `hummingbot-api-client` — API client library |
  | **Clients & Community** (people) | `hbot-remote-client-py` — remote client · `community-tools` — community utilities · `awesome-hummingbot` — curated ecosystem |
  | **Docs & Data** (book) | `hummingbot-site` — docs & website · `condor-docs` — Condor docs · `datadog` — volume reporting |

  *(Star counts shown as a small `12.3k ★` chip per row, tabular-nums.)*

### 5.5 Volumes strip — `<VolumesStat>`
Compact stat strip — "**$X** traded · **N** exchanges · **N** bots" (top-line aggregates read from the `/volumes` dataset, §7), tabular-nums + `Intl.NumberFormat`, with "View full dashboard →" → `/volumes`. Optional small sparkline of daily volume.

### 5.6 Exchanges — `<ExchangeGrid>`
Logo grid of supported exchanges, grouped/labeled by type (CLOB CEX / CLOB DEX / Gateway DEX). The Docs Exchanges tab currently ships **35 CEX/DEX connectors + 12 Gateway DEXs** (47 pages); "50+" is the marketing aggregate (connectors + Gateway blockchain networks). Each logo links into the **Docs Exchanges tab** (keeps existing slugs). Data: the exchange list under `~/hummingbot-site/docs/exchanges` (+ logo assets). "View all exchanges →" link.

### 5.7 "Market Makers love Hummingbot" — `<TweetMarquee>` *(NEW — models bun.sh "Developers love Bun")*
Heading "**Market Makers love Hummingbot.**" (brand-gradient, like bun's pink title) over **3 rows of horizontally-scrolling tweet cards**, adjacent rows scrolling **opposite directions**, edges fading via a CSS mask.
- **`<TweetCard>`:** display name (bold) + `@handle` + date (right-aligned, `Intl.DateTimeFormat`) + tweet text (`line-clamp-4`). Card = `bg-card border rounded-xl p-5`, fixed width (~320px), avatar optional.
- **Motion:** pure-CSS infinite marquee — duplicate the row once and `translateX(-50%)` loop; **pause on hover/focus**; under `prefers-reduced-motion` render a **static non-animated grid** instead. Use `transform` only.
- **A11y/perf:** marquee wrapper `aria-label="Community testimonials"`; cards are real `<a>` to the source tweet; `content-visibility:auto` on offscreen rows.
- **Data:** curated content file `/content/testimonials.json` (real community/market-maker tweets — name, handle, date, text, url). Editorial content, not live API; can later wire to the X API. *(This is testimonial content, so a content file is appropriate — not a data "fallback.")*

### 5.8 Newsletter + Discord — `<NewsletterSignup>`, `<CommunityCTA>`
- Email capture following the **email-best-practices** skill: real `<label>`, `type="email"`, `autocomplete="email"`, inline validation, submit stays enabled until request starts then spinner, `aria-live` success/error, double opt-in, SPF/DKIM-ready provider (Resend, as Botcamp uses).
- Discord/community CTA card with member count (live if available).

### 5.9 Footer — `<SiteFooter>` *(copied from bun.sh layout, mapped to our items)*
bun.sh footer = 3 link columns (RESOURCES / TOOLKIT / PROJECT) + a "Baked with ❤️ in SF / We're hiring" branding block. Our mapping:

| **Resources** | **Ecosystem** | **Foundation** |
|---|---|---|
| Docs | Hummingbot | About |
| Hub | Condor | Governance |
| Blog | Gateway | HBOT |
| Volumes | Dashboard | Bounties |
| Exchanges | Hummingbot API | Rewards ↗ |
| Discord | MCP | Education ↗ |
| GitHub | Quants Lab | Contributing |

- **Branding block:** logo + tagline (e.g. *"Built by market makers worldwide"*) + social icons (X, Discord, YouTube, GitHub) + newsletter mini-form + legal (License, Privacy) + theme toggle.
- Columns are `<nav aria-label>`'d lists of `<a>`; `↗` marks external (Rewards/Education).

### 5.10 Component inventory (home)
`AnnouncementBar` · `SiteHeader`/`NavMenu`/`MobileNav` · `Hero` · `InstallCommand`(+`CodeBlock`,`CopyButton`,`Tabs`) · `GitHubStars` · `LogoMarquee` · `BuildCards`/`BuildCard` · `EcosystemGrid`/`RepoCategoryCard`/`RepoLink` · `VolumesStat`(+`Sparkline`) · `ExchangeGrid` · `TweetMarquee`/`TweetCard` · `NewsletterSignup` · `CommunityCTA` · `SiteFooter` · primitives: `Button`, `Card`, `Badge`, `Tabs`, `Input`, `Icon`, `GradientText`, `Section`. The primitives + shell live in `packages/ui`, built in **Phase 0** (§10) and reused by both `apps/site` and `apps/hub`.

## 6. The Hub (Strategies / Routines / Agents) — `apps/hub` in the monorepo ✅

> **Separate app in the monorepo** (`apps/hub` → `hub.hummingbot.org`): a standalone Next app = registry UI + API route handlers + Prisma/Neon + GitHub OAuth + background jobs, with its own Vercel project/deploy. Imports `packages/{brand,tokens,ui}` like the marketing site. API types live inside `apps/hub` and are imported by its own UI (no shared package). The marketing site **links** to it (nav) and **reads aggregate counts** from its public API (build cards, "What you can build"), typing that small response inline.

> **Reference:** [clawhub.ai](https://clawhub.ai) + [docs.openclaw.ai/clawhub](https://docs.openclaw.ai/clawhub) — ClawHub's own repo (`src/` web + backend + CLI) is the structural template for `apps/hub`. *(ClawHub also ships a `packages/schema/`, but that's because their CLI is TypeScript; ours is Python, so we skip it.)* Model the Hub as a **public community registry** — installable, versioned, namespaced — *not* a strategy gallery. Botcamp's `StrategiesClient` is explicitly **out of scope** as a reuse target; we redesign from scratch against the ClawHub pattern. Tagline cue: *"Built by the community."*

### 6.1 Mental model — Hub is a registry, not a gallery

Three entity types, one registry shell:

| Type | What it is | Install target |
|---|---|---|
| **Strategy** | Hummingbot v1 script or v2 controller bundle | `hummingbot` |
| **Routine** | Condor routine — declarative, schedulable workflow | `condor` |
| **Agent** | Condor agent — autonomous trading harness | `condor` |

Each item is **namespaced** (`@author/name`), **versioned** (semver + `latest` tag), and **installable** via a copy-to-clipboard CLI command. The Hub is the **canonical source of truth** for every primitive in the Hummingbot/Condor ecosystem.

### 6.2 Hub home (`/hub`) — search-first registry landing

ClawHub's hero pattern, retuned for trading:

- **Hero**: H1 *"Built by the community."* + subhead *"Trading strategies, routines, and agents — installable in one command."* + big **search bar** with example tag chips (`xemm`, `arbitrage`, `binance`, `solana`, `market-making`, `delta-neutral`).
  - **Search = Postgres full-text** (`tsvector` over title/summary/README/tags + `pg_trgm` for fuzzy/typo tolerance), ranked by relevance × install count. *(We drop ClawHub's embeddings/pgvector approach — no embedding provider, no API key; FTS is plenty for this catalog size. Mintlify's built-in search covers docs/blog content, not the registry DB — different surface.)*
- **Stats strip** under the search: `<N> primitives · <N> publishers · <N> installs · <avg> ★` (live from the registry).
- **Three browse cards**: **Strategies / Routines / Agents** with item counts and short descriptions, deep-linking into the per-type browse view.
- **Featured row**: editorially-curated, mixed-type — same card style as the browse list.
- **Trending row**: top 6 by 7-day installs.
- **Publishers row**: avatar grid of top publishers (links to `/hub/publishers`).

### 6.3 Browse views (`/hub/strategies`, `/hub/routines`, `/hub/agents`)

Shared shell; the only difference between the three URLs is the type filter preset and the install-command prefix shown on each card.

- **Left sticky sidebar** (per ClawHub):
  - **Sort**: `Featured`, `Most installed`, `Most starred`, `Recently updated`, `Newest`, `Name`.
  - **Category**: `All`, `Market Making`, `Arbitrage`, `Liquidity Provision`, `Directional`, `Cross-Exchange`, `Perp`, `Other`.
  - **Exchanges**: multi-select chips (Binance, Gate.io, OKX, Hyperliquid, Derive, XRPL, Orca, …).
  - **Capabilities**: `Has video`, `Has source`, `Audited`, `Certified`.
- **View toggle**: list ↔ grid (ClawHub-style), persisted in URL.
- **Card** (ClawHub registry card, *not* a Botcamp strategy card):
  - Avatar / type icon + **`@author/name`** in mono + small type badge.
  - One-line summary.
  - **Inline install command** with copy button: `condor install @author/name` or `hummingbot install @author/name`.
  - Footer row: `v1.4.2 · 3.2k installs · 184 ★ · updated 2d ago · MIT` + tag chips.
- **URL-synced filter state** via `nuqs` so any view is deep-linkable and shareable. (This is the one UX detail we keep from the Botcamp Hub.)

### 6.4 Detail page (`/hub/<type>/@<author>/<name>`)

Registry-style, not strategy-detail-style. Sections in order:

1. **Header** — type icon, `@author/name`, semver pill + `latest` tag, short summary, **copy-to-clipboard install command** (front-and-center), Star button, Report button.
2. **Stat row** — installs (total + 7d), stars, version count, last published, license.
3. **README** — rendered MDX (the bundle's `STRATEGY.md` / `ROUTINE.md` / `AGENT.md`), with anchored TOC.
4. **Install & Run** — tabs for `condor` / `hummingbot` / raw clone, with the exact CLI invocation and minimum runtime version.
5. **Compatibility** — exchanges supported, required Hummingbot/Condor version range, declared dependencies.
6. **Versions** — semver table with changelog excerpts and per-version downloads sparkline.
7. **Files** — file tree from the bundle (read-only), with syntax-highlighted preview on click.
8. **Author** — publisher card linking to `/hub/publishers/@<author>` + their other primitives.
9. **Security** — automated scan summary (matches ClawHub's "automated scanning, moderation, user reporting"), audit badge if certified, "Report this primitive" link. Scan-held/blocked releases are hidden from public surfaces but stay visible to the owner in their dashboard.
10. **Comments** — ClawHub supports comments alongside stars; signed-in users can discuss/report per primitive.
11. **Related** — same-category items.

### 6.5 Publishers (`/hub/publishers`, `/hub/publishers/@<author>`)

A first-class navigation surface (ClawHub treats Publishers as a top-level browse target):

- **Index**: searchable, sortable grid of publishers (avatar, handle, primitive count, total installs, joined date).
- **Profile**: avatar + bio + links + tabbed list of their Strategies / Routines / Agents + aggregate stats.

### 6.6 Submission & publish flow

ClawHub's CLI-first publish model — not a web form:

- **CLI publish**: `condor publish` / `hummingbot publish` reads a bundle manifest (`name`, `version`, `type`, `summary`, `tags`, `exchanges`, `entry`, `license`) and uploads to the registry. Mirror ClawHub's `--slug --name --version` flags and **`--dry-run`** (builds the exact publish plan without uploading).
- **Auth = GitHub OAuth** (ClawHub uses GitHub OAuth via Convex Auth) with an **account-age gate** on first publish to deter spam/abuse. The web app and both CLIs share this identity.
- **Owner `/dashboard`**: list of owned primitives with unpublish/yank controls, API tokens for the CLI, and **visibility into scan-held/blocked releases** (hidden from public, still shown to the owner).
- **Versioning**: strict semver; `latest` tag auto-points to newest published version; yanked versions stay resolvable but render a warning on the detail page.
- **Moderation**: automated scan on publish (lint, secrets, manifest validation, declared-vs-actual behavior check) + manual review queue for `Certified` badge. Signed-in users report; moderators hide/restore content and ban abusive accounts. **Soft-delete hides a listing and redirects its old slug**; hard delete is admin-only.

### 6.7 CLI & install-command UX (the bun.sh-style move)

ClawHub ships **two CLIs**: native host commands (`openclaw skills install …`) *and* a dedicated `clawhub` CLI for cross-cutting search/explore/publish. We mirror that:

- **Native install** via the runtime the primitive targets:
  ```
  condor install @hummingbot/cross-exchange-mm
  hummingbot install @binance/spot-pmm
  ```
- **Dedicated `hub` CLI** *(optional, later)* for registry-wide actions: `hub search`, `hub explore`, `hub install <slug>`, `hub pin <slug>`, `hub uninstall`, `hub list`, `hub update --all`, `hub publish` — mirroring ClawHub's command set. *(v1 ships install/publish inside the existing `condor`/`hummingbot` CLIs per §2/§11.8; a standalone `hub` CLI is a follow-up if cross-runtime UX warrants it.)*
- **Pinning** (from ClawHub): a local install can be frozen so `update`/reinstall won't overwrite a user's customizations.
- **Telemetry**: install counts come from authenticated sync, opt-out via env flag (ClawHub uses `CLAWHUB_DISABLE_TELEMETRY=1`).

Every surface that mentions a primitive shows its install command with a one-click copy button — making the Hub feel like a package registry (npm/pypi/clawhub) rather than a content library, and giving every card/detail/related-item a clear next action.

### 6.8 Hub data — shared content registry (decided ✅, revised)

Stand up a **new shared content registry** (Postgres/Neon via Prisma) as the canonical source of truth. **Botcamp's `Strategy` schema is a starting point but not the spec** — the registry shape (namespace, version, install metrics) drives the schema:

- **Primary keys**: `(namespace, name, version)`. Namespaces are owned by Publisher accounts; `latest` is a per-`(namespace, name)` pointer.
- **Core fields**: `type ∈ {STRATEGY|ROUTINE|AGENT|CONTROLLER|SCRIPT}`, `summary`, `description` (MDX), `tags[]`, `exchanges[]`, `categories[]`, `license`, `entry`, `runtimeRange` (e.g. `hummingbot: ">=2.4"`).
- **Bundle**: `files[]` (path + bytes/url + mime), `images[]`, `videoURL`, `repoURL`.
- **Registry metrics**: `installs` (lifetime + per-day rollups), `stars`, `downloads`, `scanStatus`, `certifiedAt`, `yankedAt`.
- **Compat with Botcamp**: existing Botcamp `Strategy` rows seed into the registry as `@botcamp-cohort-13/<slug>` namespaced entries with synthetic `v0.1.0` versions, so no content is lost.
- **Migration path**: seed the new registry from Botcamp's DB; **point Botcamp's `/strategies` at the shared registry** (or migrate its rows over) so there's a single dataset and no duplication. **The schema and DB are owned by the `hub` repo**, not this marketing site.
- **Search**: Postgres full-text — a generated `tsvector` over title/summary/README/tags + `pg_trgm` index for fuzzy matching; rank by relevance × installs. No embeddings/pgvector, no external provider.
- Expose a thin typed API (route handlers) for both the web Hub and the publish/install CLIs; ISR like Botcamp's `revalidate = 60` for browse, on-demand revalidation on publish for detail pages.

> **Tech-stack note:** ClawHub itself runs TanStack Start + Convex + Bun. We copy its **product design and registry UX**, not its infrastructure — the `hub` repo stays Next.js 16 + Prisma/Neon Postgres + npm (consistent with the marketing site, but a **separate deploy**). Auth aligns on **GitHub OAuth** to match ClawHub's identity model.

*Sequencing note:* the new Hub can ship reading a seeded copy first; the Botcamp cutover and the CLI publish/install commands are follow-ups so we don't block either app.

## 7. Volumes (`/volumes`) — port of `hummingbot/datadog`

The `hummingbot/datadog` repo is a static HTML/JS dashboard backed by four CSVs exported from the Datadog API. **Data collection ended 2026-03-16**, so this is now a *fixed historical dataset* — we don't need a live Datadog connection. Rebuild it natively in the app for a consistent look and better interactivity:

- **Vendor the four CSVs** into `apps/site` (`apps/site/data/volumes/*.csv` → committed or converted to JSON at build time):
  - `total_daily_volume.csv` — consolidated daily volume
  - `volume_by_exchange.csv` — per-connector breakdown
  - `volume_by_version.csv` — per Hummingbot version
  - `volume_by_instance.csv` — per anonymized instance
- **Rebuild charts natively** (Recharts or visx) instead of iframing GitHub Pages: time-series area chart with range filter, sortable exchange ranking table with volume-share %, version/instance breakdowns. Charts honor `prefers-reduced-motion`; numbers use `tabular-nums` + `Intl.NumberFormat`.
- **Note the data window** in the UI ("Aggregated metrics reported through 2026-03-16"), and keep the privacy note ("no personal info, wallet addresses, or API keys").
- **Optional**: keep `export_data.py` in a `scripts/` dir documented as the historical refresh path, in case collection ever resumes.
- The Home "Volumes" strip reads top-line aggregates from the same dataset.

## 8. Blog + Release Notes — in Mintlify (`apps/docs`) ✅

**Decided:** blog and release notes live in **Mintlify alongside the docs**, as one MDX content store, using **Mintlify's built-in search**. Same model as bun putting their guides in Mintlify — one place to maintain MDX, free search, no custom blog/search code. Trade-off accepted: docs-style presentation rather than a custom bun.sh card-grid index.

### 8.1 One store in Mintlify, organized by category
- **Location:** `apps/docs/blog/*.mdx` (one folder; release notes included). MDX front-matter: `title`, `date`, `author(s)`, `category`, `tags[]`, optional `version`.
- **Navigation:** a **"Blog" tab** in `docs.json` with **groups per category** — `Releases` · `Roadmap` · `Governance` · `Connectors` · `Interviews` · `Tutorials` · `Announcements` · `Engineering` — newest-first within each. `Releases` can also be its own top-level tab for prominence. (Categories map to Mintlify nav groups, not a custom filter UI.)
- **Search:** Mintlify's built-in `⌘K` search indexes all blog + docs MDX. No custom search.
- **Landing:** a simple "Blog" overview page (intro + latest links / recent releases) using Mintlify `<Card>`/`<Columns>` components — not the custom `<PostCard>` grid from earlier drafts.

### 8.2 Post styling (Mintlify MDX)
- **Articles** — standard Mintlify MDX pages (headings, callouts, code, images).
- **Release notes** (`category: Releases`) — keep the source structure that's [already bun-like](https://bun.com/blog/bun-v1.3.14): version title + release date, the **repo → GitHub/DockerHub release table** (renders as a normal MDX table), then emoji-sectioned **Release Highlights** with PR/bounty credit links. Rendered with Mintlify's components rather than a custom React template.

### 8.3 Migration (into `apps/docs/blog`)
- **Blog (103):** `~/hummingbot-site/docs/blog/posts/*/index.md` → `apps/docs/blog/<slug>.mdx` (front-matter normalization, image paths → Mintlify `/images`, internal-link rewriting, infer `category`).
- **Release notes (48):** `~/hummingbot-site/docs/release-notes/<version>.md` (1.0.0 → 2.14.0) → `apps/docs/blog/hummingbot-v<version>.mdx` with `category: Releases`, `version`, `date` from the "*Released on …*" line.
- **NOT blog:** `release-notes/index.md` + `releases.md` are PR/QA **process docs** → a docs page in the Documentation tab, not the blog.

### 8.4 Redirects (cross-domain → `docs.hummingbot.org`)
Blog now lives on the docs subdomain, so redirects from the old marketing paths point there (configured in `apps/site` `next.config`/`vercel.ts` for cross-origin redirects, plus Mintlify `redirects` for any internal moves):
- `hummingbot.org/blog` → `docs.hummingbot.org/blog`
- `hummingbot.org/release-notes/` → `docs.hummingbot.org/blog` (Releases group)
- `hummingbot.org/release-notes/<version>/` → `docs.hummingbot.org/blog/hummingbot-v<version>` (e.g. `2.14.0` → `…/blog/hummingbot-v2.14.0`) — generated for every version file.
- Old `hummingbot.org/blog/posts/<slug>/` → `docs.hummingbot.org/blog/<slug>`.
- Generated from a map produced by the migration script.

> **Nav impact:** the top-nav **"Blog"** link points to `docs.hummingbot.org/blog` (external-style, like Docs), with a **Releases** shortcut to the Releases group. It is no longer a page in `apps/site`.

## 9. About

Four sections (own pages or one page with anchors): **Foundation**, **Bounties**, **HBOT** (token/governance asset), **Governance**. Content sourced from existing `~/hummingbot-site/docs/about`, `docs/bounties`, governance blog posts.

## 10. Build phases

**Phase 0 — Monorepo foundation (do first):** init Turborepo + npm workspaces; create `packages/tokens` (Tailwind v4 `@theme` + TS, §3.1), `packages/brand` (logos/favicons/OG from `~/hummingbot-site` assets), `packages/ui` (the bun.sh-style component kit: `Button`, `Card`, `Badge`, `Tabs`, `Input`, `GradientText`, `Section`, `CodeBlock`/`CopyButton`, `AnnouncementBar`, `SiteHeader`/`NavMenu`/`MobileNav`, `SiteFooter`); scaffold empty `apps/{site,hub,docs}`; install design-guidelines skill; wire 3 Vercel projects (Root Directory + Ignored Build Step per app).

**Track A — `apps/site` (marketing):**
1. **Home** — all 10 sub-sections (§5.0–5.9): announcement bar, hero+install, used-by, build cards, **ecosystem repos grid** (GitHub API at build), volumes strip, exchanges, **"Market Makers love Hummingbot" marquee**, newsletter+Discord, footer. Responsive, dark-first.
2. **Volumes** — vendor `hummingbot/datadog` CSVs, rebuild charts natively at `/volumes`.
3. **About** + **external redirects** (Education, Rewards) + cross-domain redirects to Docs/Blog.
4. **Polish** — design-guidelines audit pass, perf/Lighthouse, SEO/OG, analytics, full old→new redirect map.

**Track B — `apps/hub` (registry; can run in parallel, shares `packages/*`):**
1. **Registry foundation** — Next app + Prisma/Neon schema (§6.8) + GitHub OAuth + seed from Botcamp DB. API types live in-app.
2. **Search + browse** — Postgres full-text search, ClawHub-style home + browse ×3 + detail + publishers.
3. **Publish/install + jobs** — CLI integration in `condor`/`hummingbot`, security scanning, install-count rollups; Botcamp `/strategies` cutover.

**Track C — `apps/docs` (Mintlify — docs + blog):**
1. Move `~/condor-docs` (incl. `docs.json`) into `apps/docs`; enable Mintlify **Git Settings → "Set up as monorepo"**, path `/apps/docs`; mirror brand colors in `docs.json`.
2. Add Hummingbot doc sections + **Exchanges tab** (keep slugs) + release-process page.
3. **Blog + Release Notes** (§8) — migration script (103 posts + 48 release notes) → `apps/docs/blog`, "Blog" tab with category groups + Releases group; cross-domain redirect map for `/release-notes/*` and `/blog/*`.

## 11. Decisions

**Locked ✅**
1. **Runtime / package manager:** npm.
2. **Hub data:** new shared content store as canonical source; seed from Botcamp, then cut Botcamp over to it (no duplication).
3. **Repo strategy:** full replacement — `hummingbot-site-v2` becomes `hummingbot.org`, with a redirect map from all old mkdocs URLs to preserve SEO.
4. **Volumes:** rebuild `hummingbot/datadog` natively at `/volumes` (fixed historical dataset, no live Datadog).
5. **Tailwind:** v4 (CSS-first `@theme inline`). **All components redesigned from scratch**, clean modern bun.sh-style — not ported 1:1 from Botcamp.
6. **Slugs / redirects:** **Exchanges and Docs keep their existing slugs** (in Mintlify). **Blog + Release Notes move into Mintlify** (`apps/docs/blog`) as one store; releases = a category group. Cross-domain redirects: `/blog` & `/release-notes/*` → `docs.hummingbot.org/blog/*` (per §8.4).
7. **Demo-day trailer:** scrapped — no video reel on the hero.
8. **Repo topology:** **Turborepo monorepo** (npm workspaces) — `apps/{site,hub,docs}` + `packages/{brand,tokens,ui}`. Each app = its own Vercel project/deploy (independent via Ignored Build Step). Logos/tokens/UI shared via packages (no published packages, no drift). Hub API types live in `apps/hub`; other readers call its HTTP API directly. CLI stays in the Python `condor`/`hummingbot` repos.
9. **Blog location & search:** blog + releases live in **Mintlify** (`apps/docs`), using Mintlify's **built-in search** — no custom blog UI or search code (bun-guides model). Accepted trade-off: docs-style presentation over a custom card-grid index.
10. **Hub search:** **Postgres full-text** (`tsvector` + `pg_trgm`), no embeddings/pgvector, no external provider.
11. **Install commands:** clean **vanity URLs** (OpenClaw pattern) — `curl -fsSL https://hummingbot.org/install.sh | bash` (Hummingbot) and `…/condor.sh` (Condor); `apps/site` 302-redirects to scripts in the `deploy` repo. A **new `deploy/main/install.sh`** (modeled on Condor's `setup.sh` + OpenClaw OS detection) is a `deploy`-repo task.
12. **Display font:** **Satoshi** (reused from Botcamp, shipped via `packages/tokens`).
13. **Testimonials:** user curates real market-maker tweets into `apps/site/content/testimonials.json`.
14. **Announcement bar:** use the current banner — *"Introducing Condor 🦅 — The Open Source Harness for Trading Agents ➡️"* → Condor intro blog post.
15. **Monorepo root:** build in place at **`~/hummingbot-site-v2`** (becomes Turborepo root; marketing → `apps/site`).
16. **Domains & deploy mgmt:** **Vercel CLI**–managed (§12). Soft-launch the marketing site at **`dev.hummingbot.org`** (prod build, not yet the apex); Hub at **`hub.hummingbot.org`**, docs+blog at **`docs.hummingbot.org`** go live on the new site directly. Apex `hummingbot.org` cutover from the old mkdocs site happens after `dev` validation.

**Still open**
- *None blocking Phase 0.* Remaining items are content/ops to fill in during build (exact testimonial entries, final exchange/partner logo set, DNS apex cutover timing).

## 12. Domains & deployment (Vercel CLI)

All deploys managed via the **Vercel CLI** (`vercel`, `vercel deploy`, `vercel env`, `vercel domains`, `vercel link`). *(CLI not yet installed — `npm i -g vercel` first; `vercel login`.)*

**Three Vercel projects** (one per app, from this monorepo; Root Directory + Ignored Build Step per §2):

| App | Vercel project root | Production domain | Notes |
|---|---|---|---|
| `apps/site` | `apps/site` | **`dev.hummingbot.org`** (soft-launch) → later apex `hummingbot.org` | Test the real prod build on `dev` before the apex cutover from the old mkdocs site. |
| `apps/hub` | `apps/hub` | **`hub.hummingbot.org`** | New site goes live here directly (no legacy to replace). Own env (DB, OAuth). |
| `apps/docs` | `apps/docs` (Mintlify) | **`docs.hummingbot.org`** | Deployed by Mintlify's GitHub app (monorepo path `/apps/docs`), not Vercel — domain still managed in DNS. Hosts docs + blog + releases. |

> **Note — `condor.hummingbot.org`:** the docs content (e.g. `blog/introducing-condor`, `documentation/condor`, podcast pages) links to `https://condor.hummingbot.org` as the Condor product destination. This subdomain is **not** one of the three apps above; either keep it as an existing external Condor landing page (and list it as a known destination), or update those in-doc links to `docs.hummingbot.org` if Condor has no standalone site.

**Sequencing:**
1. Build `apps/site` → deploy to `dev.hummingbot.org` (prod build, validate end-to-end).
2. Bring up `hub.hummingbot.org` and `docs.hummingbot.org` on the new stack directly.
3. **Apex cutover:** once `dev` is validated, point `hummingbot.org` at the `apps/site` Vercel project and ship the old→new redirect map (§8.4, §10). The old mkdocs site is retired at this step.

**Per-app config:** each project gets its own `vercel.json`/`vercel.ts` (build command via `turbo`, env vars via `vercel env`), Ignored Build Step (`turbo-ignore` or `git diff` on the app path) so a `site` change doesn't rebuild `hub`. Env: marketing needs Resend (newsletter) + analytics; Hub needs Neon `DATABASE_URL` + GitHub OAuth secrets.
