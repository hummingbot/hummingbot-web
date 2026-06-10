---
title: "Running Multiple Bots in the GRVT Team Trading League"
description: "An operator playbook for the GRVT Team Trading League (June 11-30, 2026). Learn how GRVT's negative maker fees, the top-10 ROI scoring, and Hummingbot's V2 c"
date: "2026-06-10"
author: "Hummingbot Foundation"
category: "Tutorials"
excerpt: "GRVT is running a 20-day Team Trading League with negative maker fees and a leaderboard scored on each team's top-10 ROI performers. That combination is tailor-made for Hummingbot. This is a hands-on operator playbook for fielding a team and running multiple maker bots to clear the volume gates and climb the ROI leaderboard…"
cover: ""
---
[GRVT](https://grvt.io/) is running a **[Team Trading League](https://help.grvt.io/en/articles/15341353-grvt-team-trading-league)** from **June 11 to June 30, 2026** — a 20-day, team-based trading competition. Between GRVT's **negative maker fees** and a leaderboard scored on each team's **top-10 ROI performers**, it's a near-perfect fit for automated market making with Hummingbot.

This post is an **operator playbook**: how to field a team and run *multiple* maker bots that clear the volume gates and climb the ROI leaderboard. It assumes you already know how to connect Hummingbot to GRVT — if not, start with the [GRVT connector guide](/blog/trading-on-grvt-with-hummingbot-complete-bot-development-guide) and the [GRVT exchange docs](https://docs.hummingbot.org/exchanges/grvt), then come back here.

## What actually scores — read this first

Two separate things matter in this competition, and they pull in different directions:

| Metric | How it's measured | What it rewards |
| --- | --- | --- |
| **Team rank** | Average **ROI** of the team's **top-10** performers. ROI = (Eligible PnL / Starting Balance) × 100 | A few *highly profitable* members |
| **Reward eligibility** | Per member: ≥100 USDT balance, **≥$10k volume** (leaderboard), **≥$100k volume** (lucky draw) | *High volume* per member |

Teams can have 10–1,000 members but need at least 10 eligible members to qualify, and rewards are split among eligible members — not just the captain.

**The insight most teams miss:** ROI is `PnL / starting balance`. A member who makes $200 of PnL on a $400 starting balance posts **50% ROI**; the same $200 on a $4,000 balance posts only **5%**. So your *scoring* members want **modest starting balances and real profit**, while *every* member needs to clear the volume gate. Those are two different jobs — which is exactly why you run **multiple bots with different roles** rather than one big bot.

## The fee edge — and why it means "maker-only"

GRVT charges **negative maker fees** across all nine tiers, but the rebate is small:

| 30-day volume | Maker fee | Taker fee |
| --- | --- | --- |
| $0 (everyone starts here) | **−0.0001%** | 0.045% |
| $10M | −0.001% | 0.037% |
| $100M | −0.002% | 0.032% |
| $1B | −0.003% | 0.024% |

Don't treat the rebate as a profit center — at tier 1 it's about $1 per $1M traded. The real edge is that **providing liquidity costs you essentially nothing**, so you can churn through the volume gates and capture bid/ask spread with zero fee drag.

The practical rule that follows: **be maker-only, always.** Every taker fill costs 0.045% — that single mistake bleeds your ROI and erases rebate accrual. In Hummingbot terms, keep spreads just outside the touch and avoid aggressive refresh logic that ends up crossing the book.

## Why multiple bots (and what "multiple" means here)

The competition scores each *member* individually, so "multiple bots" here means running **several V2 controllers across different markets and roles inside one Hummingbot deployment** — not multiple machines. Three reasons:

1. **Diversify inventory risk** — a 5% move against you on one pair is offset by the others.
2. **Multiply volume** — four pairs each doing ~$150/day of round-trip volume clears the $10k gate comfortably and marches toward $100k.
3. **Separate the two jobs** — dedicate some controllers to *volume churn* (tight spread on the most liquid pair) and others to *ROI* (wider, profitable spreads plus funding capture).

GRVT's most liquid perps are **BTC, ETH, and SOL** (deep books, good for tight maker quoting), plus lower-volatility instruments like **PAXG** (tokenized gold) that make excellent low-risk volume fillers.

## Team structure

- **Captain / coordinator** creates the team on GRVT, recruits 20–30 members (so you have a deep top-10 pool), and runs shared monitoring.
- **Two member archetypes:**
  - **Volume runners** — their job is to clear the $10k gate (and chase $100k for the lucky draw). Tight-spread maker bots on BTC/ETH; break-even-ish PnL is fine.
  - **ROI scorers** — your top-10 candidates. *Smaller* starting balance ($200–500), wider profitable spreads, funding capture. These drive the team rank.
- Every member keeps ≥100 USDT and stays maker-only.

## Per-operator setup (do this on day one)

1. **Open a GRVT account and sub-account**, deposit USDT, and **choose your starting balance deliberately** — it's your ROI denominator. Scorers lean small ($300–500); volume runners hold enough to size orders ($500–1,000).
2. **Generate API credentials** on GRVT (API Keys → Create → Generate, enable the **Trade** permission). You'll get an **API Key**, a **Secret Private Key** (shown only once — save it), and a **Trading ID** (`sub_account_id`).
3. **Install Hummingbot**, run `connect grvt_perpetual`, enter the three credentials, and verify with `balance`. (Full walkthrough in the [GRVT connector guide](/blog/trading-on-grvt-with-hummingbot-complete-bot-development-guide).)
4. *(Recommended for teams)* Stand up the [Hummingbot Backend API + Dashboard](https://docs.hummingbot.org/dashboard), or use [Condor](/blog/introducing-condor) — the Telegram bot that already deploys and monitors **multiple** Hummingbot bots over the same API. Either gives the captain one place to watch the whole team.

## A multi-bot configuration to start from

Run these as separate controllers in **one** [V2 deployment](https://docs.hummingbot.org/strategies/v2-strategies) per member. These are starting points, not gospel — tune to live spreads:

**Volume-runner controller — BTC-USDT Perp (`pmm_simple` / PMM):**

- Tight spread: just outside the best bid/ask so you stay maker.
- Order refresh 15–30s; order amount sized so daily round-trip volume lands around $150–500.
- ONE-WAY position mode; 50/50 inventory target; hard stop if skew runs too far.
- Target: ~$500/day clears the $10k volume gate over 20 days.

**ROI-scorer controllers — ETH + SOL Perp (PMM with inventory skew):**

- Wider spreads to capture real edge (e.g. 5–15 bps per side depending on pair volatility).
- Enable inventory skew so you don't accumulate a directional bag.
- Bias quotes toward the side that *receives* funding each 8-hour cycle.
- Smaller notional and smaller starting balance → spread profit shows up as high ROI%.

**Safe-volume controller — PAXG Perp (optional):**

- Low-volatility pair, very tight spread, pure gate-filler with minimal inventory risk.

[Grid Strike](/blog/strategy-guide-grid-strike) is also a strong fit for range-bound BTC/ETH, generating steady maker volume across a price band.

## Risk management — non-negotiable for a 20-day sprint

- **Maker-only, always.** One config that crosses the spread means 0.045% taker bleed plus ROI damage.
- **Cap per-controller notional and total leverage.** ROI cuts both ways — a blow-up on a small denominator is a huge *negative* ROI that can drag your team's top-10.
- **Inventory skew and stop-loss** on every directional accumulation.
- **Watch funding** every 8 hours — don't sit on the paying side of a large funding rate.
- **Don't starve capital to juice ROI.** Too little and you can't size orders or clear the volume gate. The sweet spot is "small enough to lift ROI%, large enough to trade meaningfully."

## Monitoring and team coordination

- Use **Condor's `/bots`** view as the team's shared dashboard — it shows every active bot's status and metrics, and `/portfolio` tracks PnL — all over Telegram.
- Track each member daily against both gates: **volume ≥ $10k** and **ROI trend**. Mid-competition, shift laggards from "scorer" to "volume runner" configs, and add capital to whoever's posting the best ROI — they're your top-10.
- In the final days, **lock in your top-10**: reduce their risk and stop adding size once they're ranking, and push any stragglers over the $100k lucky-draw line if it's reachable.

## Timeline

- **Setup (June 10):** Captain creates the team; members open accounts, deposit, generate keys, install Hummingbot, and connect GRVT.
- **Start (June 11):** Deploy controllers, confirm maker fills, confirm volume is accruing.
- **Daily:** Monitor via Condor; rebalance roles; keep everyone ≥100 USDT.
- **Final stretch (~June 27–30):** De-risk the top-10 scorers; push stragglers over the $100k lucky-draw line where reachable.

## The honest bottom line

The maker rebate alone won't win this — it just makes volume *free*. Your ROI comes from spread capture, funding, and keeping the denominator small. And because the leaderboard is scored on ROI, a single leveraged blow-up hurts far more than it helps. The winning approach is conservative, maker-only, and spread across multiple pairs — which is precisely what Hummingbot's V2 controllers are built to run.

*Trading involves risk. This guide is for educational purposes and is not financial advice. Always test configurations with small size first, and never risk more than you can afford to lose.*
