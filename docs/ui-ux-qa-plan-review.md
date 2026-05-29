# Hummingbot Web UI/UX + QA Plan Review

Date: 2026-05-29

Reference checked: GitHub README for `hummingbot/hummingbot-web`, local `README.md`, and `PLAN.md`.

Local QA ports used:

- Site: `http://localhost:3101`
- Hub: `http://localhost:3102`
- Docs: `http://localhost:3103`
- Port `3000` was left untouched.

Screenshots and the Playwright JSON report from this pass are in `/private/tmp/hummingbot-web-quick-qa/`.

## Executive Summary

The repo matches the intended monorepo shape from the plan: `apps/site`, `apps/hub`, `apps/docs`, and shared `packages/brand`, `packages/tokens`, `packages/ui`. The marketing home page is substantially built and visually close to the dark, bold direction. Mintlify docs run locally and the docs/blog/exchanges navigation resolves. The Hub is usable as a seeded static registry prototype.

The release blockers are mostly implementation and QA issues rather than direction issues:

1. `npm run lint` is red.
2. Hub browse has a serious mobile horizontal overflow issue.
3. Hub has no mobile navigation.
4. Volumes displays the historical end date as March 15, 2026 in Pacific time even though the plan/data say March 16, 2026.
5. `/install.sh` and `/condor.sh` currently redirect to the same setup script.
6. Several CTAs render invalid nested interactive markup: `<a><button>...</button></a>`.
7. The Hub is still a static JSON prototype, not the Prisma/Neon/OAuth/API registry described in the plan.

## Local QA Results

| Check | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Pass | TypeScript passed across workspaces. |
| `npm run lint` | Fail | `announcement-bar.tsx` has a React hooks lint error; `filter-sidebar.tsx` has a lint warning. |
| Site home desktop | Pass | 200, correct H1, no horizontal overflow. |
| Site home mobile | Pass with polish issues | No horizontal overflow. Mobile menu is missing child links for Hub/About. Exchange logo grid needs contrast/link polish. |
| Site volumes desktop | Fail | 200 and visually good, but date is wrong: it renders "through March 15, 2026". |
| Hub home desktop | Pass with gaps | 200, no overflow. Stats/trending content does not yet match the plan. |
| Hub strategies mobile | Fail | Measured horizontal overflow of `550px`. This is a real mobile usability blocker. |
| Hub mobile nav | Fail | No hamburger/menu button; primary nav is hidden under `md`. |
| Docs introduction | Pass | 200, H1 visible, no overflow. Mintlify dev console warning is expected. |
| Docs blog overview | Pass | 200, H1 visible, releases group appears. |
| Copy buttons | Needs hardening | Automated check did not observe a stable copied state. The component also lacks clipboard rejection handling. |

## P0 Fixes

### 1. Fix lint before any deployment validation

`npm run lint` currently fails:

- `apps/site/src/components/layout/announcement-bar.tsx:12-14` synchronously sets state inside an effect from `localStorage`.
- `apps/hub/src/components/filter-sidebar.tsx:47` uses a ternary expression only for side effects.

Suggested fixes:

- Initialize announcement state with a hydration-safe pattern: render a reserved-height shell until mounted, then read `localStorage`, or use a lazy client-only mounted flag that does not trigger the hooks lint rule.
- Replace `cur.has(value) ? cur.delete(value) : cur.add(value);` with a normal `if/else`.

Plan impact: the announcement bar plan explicitly calls for no layout shift on collapse. The current default `dismissed = true` then reveal-after-hydration behavior can create a late pop-in.

### 2. Fix Hub mobile horizontal overflow

QA measured `document.scrollWidth - innerWidth = 550` on `http://localhost:3102/strategies` at mobile width.

Likely source areas:

- `apps/hub/src/components/primitive-card.tsx:30-45` uses long monospace slugs and install commands. Add `min-w-0`, `max-w-full`, `overflow-hidden`, `break-all` or better truncation around slug and command containers.
- `apps/hub/src/components/filter-sidebar.tsx:95-102` renders a large exchange chip set inline on mobile. Consider collapsed filter sections or a mobile filter drawer.
- `apps/hub/src/app/[type]/page.tsx:64-79` stacks sidebar and results, but the child content still needs strict `min-w-0` and `max-w-full`.

Acceptance check: all Hub browse/detail pages should report `overflow <= 0` at 390px and 430px wide viewports.

### 3. Add Hub mobile navigation

`apps/hub/src/components/hub-shell.tsx:34-44` hides the primary nav below `md`, and there is no mobile menu replacement. QA confirmed:

- `hasMenuButton = false`
- `primaryNavVisible = false`

Add a mobile nav with Strategies, Routines, Agents, Publishers, Dashboard, Docs, Discord, GitHub, and hummingbot.org. This is required for the Hub to work as a standalone app on mobile.

### 4. Fix Volumes date timezone bug

`apps/site/src/app/volumes/page.tsx:16-19` formats `new Date("2026-03-16")` in the user's local timezone. In America/Los_Angeles that becomes March 15, 2026.

The plan says the dataset ended `2026-03-16`. The UI currently renders March 15, 2026 in the header and chart context.

Fix by formatting date-only strings as UTC or manually parsing `YYYY-MM-DD` without timezone conversion. The visible copy should say March 16, 2026.

### 5. Split installer vanity redirects

`apps/site/next.config.ts:12-15` routes both vanity URLs to `deploy/main/setup.sh`:

- `/install.sh` -> `setup.sh`
- `/condor.sh` -> `setup.sh`

The plan says:

- `/install.sh` should redirect to the new Hummingbot client installer in `deploy/main/install.sh`.
- `/condor.sh` should redirect to the Condor setup script.

Until the Hummingbot installer lands, do not present `/install.sh` as production-ready copy unless the redirect target is intentionally equivalent and documented.

### 6. Remove invalid nested interactive CTAs

`packages/ui/src/button.tsx:35-42` always renders a real `<button>`. Several places wrap it in `<a>`, which creates invalid interactive nesting:

- `apps/site/src/components/home/hero.tsx:49-65`
- `apps/site/src/components/layout/site-header.tsx:93-95`
- `apps/site/src/components/layout/site-header.tsx:149-158`

Use `buttonVariants` on `Link`/`a`, add an `asChild` pattern, or create a dedicated `ButtonLink` component.

## P1 Fixes

### 7. Make the site mobile menu match the IA

The plan calls for Hub child links and About child links. Desktop has children in `apps/site/src/config/site.ts:31-55`, but mobile only renders top-level items in `apps/site/src/components/layout/site-header.tsx:115-129`.

QA mobile menu text only included:

`Docs, Hub, Volumes, Blog, About, Education, Rewards, Get Started, GitHub`

Add mobile child links for:

- Hub: Strategies, Routines, Agents
- About: Foundation, Bounties, HBOT, Governance

### 8. Link exchange logos to the right docs pages

The plan says each exchange logo should link into the Docs Exchanges tab while keeping existing slugs. Current code sends every logo to the generic exchanges page:

- `apps/site/src/components/home/exchange-grid.tsx:22-24`

Also, the image uses `group-hover` at `apps/site/src/components/home/exchange-grid.tsx:33`, but the parent anchor does not have `group`, so the hover opacity state does not activate.

Recommended:

- Add slug/href metadata to the exchange brand data.
- Link each logo to `docs/exchanges/<slug>`.
- Add visible text fallback or improve contrast for dark logos on dark cards. The mobile screenshot made many logos look like empty dark tiles.

### 9. Harden GitHub fetches used during render

`apps/site/src/lib/github.ts:21-75` fetches GitHub metadata for repo descriptions, stars, and release tags. These calls are cached, but they have no timeout or stale fallback beyond returning empty/null on thrown errors.

Risk: a slow GitHub response can slow first render/build. Add `AbortSignal.timeout(...)`, persist a small generated fallback where useful, and make failures observable in logs.

### 10. Align Hub home stats and trending with the plan

The plan calls for:

`<N> primitives · <N> publishers · <N> installs · <avg> star`

Current stats are:

- primitives
- publishers
- certified
- exchanges

Source: `apps/hub/src/lib/registry.ts:141-147` and `apps/hub/src/app/page.tsx:32-37`.

The plan also calls for a Trending row by 7-day installs. Current `trending()` returns newest:

- `apps/hub/src/lib/registry.ts:162-164`
- `apps/hub/src/app/page.tsx:59-60` labels it "Recently updated"

Decide whether this is intentionally a prototype or update the seed model to include 7-day installs.

### 11. Complete Hub browse UX details

Missing or incomplete against the plan:

- No list/grid view toggle in `apps/hub/src/app/[type]/page.tsx`.
- Filter state is URL-synced manually, not through `nuqs`.
- Search input pushes on every keystroke with no debounce in `apps/hub/src/components/filter-sidebar.tsx:64-68`.
- Multi-exchange filtering uses AND semantics in `apps/hub/src/lib/registry.ts:83-84`; if intended, label it "match all", otherwise switch to OR.
- `newest` and `updated` sort are the same comparator in `apps/hub/src/lib/registry.ts:107-108`.

### 12. Complete Hub detail page registry affordances

The current detail page has a good foundation, but it is short of the plan's registry-style detail page.

Implemented:

- Header
- install command
- stats
- overview text
- install/run block
- versions list
- publisher
- compatibility
- related items

Missing or incomplete:

- Star button
- Report button
- README rendered as MDX with anchored TOC
- install/run tabs for Condor, Hummingbot, raw clone
- runtime version range
- dependencies
- version changelog excerpts and per-version downloads
- file tree and code preview
- security scan summary
- comments

Source: `apps/hub/src/app/[type]/[namespace]/[name]/page.tsx:39-190`.

### 13. Treat Hub DB/Auth/API as not built yet

The plan describes a production registry with Prisma/Neon, GitHub OAuth, API route handlers, publish/install flows, jobs, moderation, and owner dashboard.

Current state:

- `apps/hub/src/lib/registry.ts:3-8` says v1 reads seed JSON and Prisma/Neon is a production target.
- `apps/hub/prisma/schema.prisma:1-6` is a target schema, not wired runtime data access.
- `apps/hub/src/app/dashboard/page.tsx:7-10` says OAuth/publish API are not wired.
- `find apps/hub/src/app -path '*route.ts'` returned no route handlers.

This is fine for a prototype milestone, but the plan should label the current Hub as static-seeded until DB/auth/API are implemented.

### 14. Fix newsletter compliance gap

The frontend says "Check your inbox to confirm" in `apps/site/src/components/home/newsletter-discord.tsx:29-31`, but the API directly creates a Resend contact with `unsubscribed: false`:

- `apps/site/src/app/api/subscribe/route.ts:31-37`

If the plan requires double opt-in, add a real confirmation flow or configure it at the email provider level and make the code/comment reflect that. Also add rate limiting or bot protection before launch.

### 15. Update stale app READMEs

These files still contain create-next-app or old docs boilerplate:

- `apps/site/README.md:1-21`
- `apps/hub/README.md:1-21`
- `apps/docs/README.md:1-57`

They mention port 3000 and Geist, while the project uses Satoshi/tokens and separate local ports. Update them with actual workspace commands and non-3000 local examples:

- Site: `npm run dev --workspace @hummingbot/site -- --port 3101`
- Hub: `npm run dev --workspace @hummingbot/hub -- --port 3102`
- Docs: `npm run dev --workspace @hummingbot/docs -- --port 3103 --no-open`

## P2 Polish

### 16. Confirm docs navigation decisions

Mintlify docs run and the Blog/Releases migration is mostly aligned with the plan. Two decisions should be made explicit:

- `apps/docs/docs.json:590-607` adds a Podcast tab, which is not in the plan. Keep it if intentional, otherwise move it under Blog or hide for v1.
- `apps/docs/docs.json:621-624` and `apps/docs/docs.json:628-633` point the primary GitHub/social GitHub links to `hummingbot/condor`. For a docs site named Hummingbot, consider pointing global GitHub to the org or core repo and adding Condor-specific links inside the Condor tab.

Also verify release note slug/title consistency:

- `apps/docs/docs.json:393` links `blog/hummingbot-v2.6.0`.
- `apps/docs/blog/hummingbot-v2.6.0.mdx:2` titles the page "Hummingbot v2.6.1 Release Notes".

That may be historically correct because of the hotfix, but the redirect map should make this deliberate.

### 17. Improve copy feedback

`packages/ui/src/copy-button.tsx:18-22` assumes clipboard write succeeds and silently does nothing on rejection. Add:

- `catch` handling
- a visible "Copied" affordance for install blocks, not just icon state
- a testable `data-state="copied"` or longer-lived status for QA

### 18. Review announcement link and copy

Plan text calls for:

`Introducing Condor - The Open Source Harness for Trading Agents ->`

Current config:

- `apps/site/src/config/site.ts:57-60`
- text includes the bird emoji and no visible arrow in config
- link points to `/blog/introducing-condor`

The page exists in docs as `blog/introducing-condor`, so this may be right. The plan's longer slug should be corrected or redirected so the announcement and redirect map do not diverge.

### 19. Design polish notes from screenshots

Site:

- Strong first impression, clear H1, good install-command focus.
- The mobile home page is very long. Consider collapsing "Used by" and Exchange logos into tighter rows on mobile.
- Exchange logo tiles need contrast and individual links.
- Testimonials are useful but should be checked at narrow widths for clipping and row height.

Hub:

- Desktop is clean and readable.
- Mobile browse is currently unusable because of overflow.
- The Hub home feels calmer and sparser than the bun.sh-inspired marketing page. That is acceptable for a registry, but it needs the package-registry affordances from the plan: install counts, trending, publishers with avatars, and stronger search/filter behavior.

Docs:

- Mintlify pages render correctly locally.
- The top-level information architecture is broader than the plan because Podcast is present.
- Local docs README is stale and should be updated so future QA does not default to port 3000.

## Recommended Order

1. Fix lint, Volumes date formatting, installer redirects, and nested CTA markup.
2. Fix Hub mobile overflow and add Hub mobile nav.
3. Re-run `npm run lint`, `npm run typecheck`, and a production `npm run build`.
4. Re-run Playwright QA on 3101/3102/3103 with desktop and mobile screenshots.
5. Decide whether the Hub is shipping as a static prototype or whether DB/auth/API are required for the next milestone.
6. Update stale READMEs and align docs nav decisions.

## Current Readiness Call

Marketing site: close to a strong v1, but not ready until lint, date, installer, mobile IA, CTA markup, and exchange links are fixed.

Hub: good prototype, not ready as the production registry described in the plan. Mobile browse/nav and backend registry gaps are the biggest issues.

Docs: locally healthy and mostly aligned with the Mintlify plan. Needs stale README cleanup and a decision on Podcast/global GitHub links.
