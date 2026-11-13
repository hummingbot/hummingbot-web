/**
 * Per-hackathon FAQ (Hackathon.faq), edited in the admin hackathon editor.
 *
 * Answers are markdown and may use {{tokens}} for values that change between
 * editions, so the copy never goes stale: they're filled from the hackathon's
 * own data at render time (see FaqContext). A hackathon with no saved FAQ
 * shows DEFAULT_FAQ — the Agent Builders Cup 2026 copy — and the admin stage
 * switcher flags it until someone reviews it for the new edition.
 */

export type FaqVisibility = "always" | "untilRegistrationCloses" | "untilRaceStarts"

export interface FaqItem {
  q: string
  a: string
  /** When the question is relevant; hidden outside that window. */
  show: FaqVisibility
}

export const FAQ_VISIBILITY_LABELS: Record<FaqVisibility, string> = {
  always: "Always",
  untilRegistrationCloses: "Until registration closes",
  untilRaceStarts: "Until the race starts",
}

/** Tokens an answer (or question) can use, with what they render as. */
export const FAQ_TOKENS: Array<{ token: string; description: string }> = [
  { token: "{{title}}", description: "Hackathon title" },
  { token: "{{startingCapital}}", description: "Starting capital per agent, e.g. $800" },
  { token: "{{agents}}", description: "Total racing agents (teams × seats)" },
  { token: "{{agentsPerTeam}}", description: "Seats per team, e.g. two agents" },
  { token: "{{raceHours}}", description: "Race length in hours" },
  { token: "{{raceStart}}", description: "Race start date" },
  { token: "{{finalsCodeFreeze}}", description: "When agents holding a finals seat lock ({{codeFreezeHours}} hours before the race)" },
  { token: "{{codeFreezeHours}}", description: "Hours before the race that seated agents lock" },
  { token: "{{registrationEnd}}", description: "Application deadline" },
  { token: "{{winnersAnnounced}}", description: "Winners-announced date (Hackathon End)" },
  { token: "{{timeline}}", description: "Numbered list of the four stages with their dates" },
  { token: "{{eligibleExchanges}}", description: "Bullet list of eligible venues" },
  { token: "{{scoringCriteria}}", description: "Bullet list of scoring criteria and weights" },
  { token: "{{weightPnl}}", description: "P&L weight, e.g. 40%" },
  { token: "{{weightVolume}}", description: "Volume weight, e.g. 40%" },
  { token: "{{weightVote}}", description: "HBOT Vote weight, e.g. 20%" },
  { token: "{{multiplierPnl}}", description: "P&L points multiplier in the score, e.g. 2" },
  { token: "{{multiplierVolume}}", description: "Volume points multiplier in the score, e.g. 2" },
  { token: "{{multiplierVote}}", description: "HBOT Vote points multiplier in the score, e.g. 1" },
  { token: "{{voteRule}}", description: "How team rankings on Snapshot become vote points" },
  { token: "{{snapshotUrl}}", description: "Link to the HBOT Snapshot space" },
  { token: "{{votingHours}}", description: "How long the Snapshot vote runs" },
  { token: "{{votingWindow}}", description: "When voting opens and closes, from the linked Snapshot proposal once there is one" },
  { token: "{{voteClosesAfterRace}}", description: "Hours the vote stays open after the race ends" },
  { token: "{{topVotePoints}}", description: "Vote points for the top team" },
  { token: "{{voteStep}}", description: "Vote points between consecutive teams" },
]

export type FaqContext = Record<string, string>

export function renderFaqText(text: string, ctx: FaqContext): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => ctx[key] ?? match)
}

const VISIBILITIES: FaqVisibility[] = ["always", "untilRegistrationCloses", "untilRaceStarts"]

/** Validates a stored/submitted FAQ. Returns the items, or an error message. */
export function parseFaq(value: unknown): { items: FaqItem[] } | { error: string } {
  if (!Array.isArray(value)) return { error: "FAQ must be a list" }
  const items: FaqItem[] = []
  for (const raw of value) {
    const item = raw as Partial<FaqItem> | null
    const q = typeof item?.q === "string" ? item.q.trim() : ""
    const a = typeof item?.a === "string" ? item.a.trim() : ""
    if (!q || !a) return { error: "Every FAQ item needs a question and an answer" }
    const show = VISIBILITIES.includes(item?.show as FaqVisibility) ? (item!.show as FaqVisibility) : "always"
    items.push({ q, a, show })
  }
  return { items }
}

/** Whether an item shows in this stage. */
export function isFaqItemVisible(
  item: FaqItem,
  { registrationOpen, stage }: { registrationOpen: boolean; stage: string },
): boolean {
  const raceStarted = stage === "ACTIVE" || stage === "JUDGING" || stage === "COMPLETED"
  if (item.show === "untilRaceStarts") return !raceStarted
  if (item.show === "untilRegistrationCloses") return registrationOpen || stage === "COMING_SOON"
  return true
}

/** The Agent Builders Cup 2026 FAQ — the starting point for every edition. */
export const DEFAULT_FAQ: FaqItem[] = [
  {
    show: "untilRaceStarts",
    q: "Who can participate?",
    a: "Anyone with a free Botcamp account. No prior trading or coding experience required — though it helps. Build a trading agent, then apply to race for a team.",
  },
  {
    show: "always",
    q: "How is the competition structured?",
    a: "The {{title}} runs in four stages:\n\n{{timeline}}",
  },
  {
    show: "untilRaceStarts",
    q: "What are the sponsor workshops?",
    a: "Sponsor teams host live workshops during the hackathon — starting **Wed, Aug 5** — covering how to build and tune trading agents for their venues. All workshops are recorded and published on [Hummingbot's YouTube channel](https://www.youtube.com/@hummingbot).",
  },
  {
    show: "always",
    q: "What is a Team?",
    a: "A Team is a constructor in this competition — an exchange or protocol sponsor that fields {{agentsPerTeam}}. Like F1's Constructors' Championship, a team's overall standing is the combined score of its agents. Botcamp is the host team, represented by the top strategies from Cohort 13.",
  },
  {
    show: "always",
    q: "What is a Trading Agent?",
    a: "A Trading Agent is an agentic trading strategy that races under a team's flag — the AI equivalent of an F1 driver. Each one runs with {{startingCapital}} in starting capital on Condor and Hummingbot infrastructure. Participants may build either a **Condor Agent** (autonomous, AI-driven) or a **Hummingbot V2 Controller** — both are eligible to race.",
  },
  {
    show: "always",
    q: "How does the {{title}} work?",
    a: "Every point an agent scores on Volume, P&L, and HBOT Vote contributes to its team's total. Individual agents are ranked 1 through {{agents}}, but the **{{title}} goes to the team with the strongest combined performance from its {{agentsPerTeam}}** — same idea as F1's Constructors' Championship.",
  },
  {
    show: "always",
    q: "What can I win?",
    a: "Every racer keeps the ending balance of their agent's **{{startingCapital}} starting capital** — which may be higher or lower depending on performance. Combined across all agents, that capital, the **competition winners' $8,500** (1st: $5,000, 2nd: $2,500, 3rd: $1,000), and **$300** in honorable mentions ($100 each) add up to the **$20,000 total prize pool**.",
  },
  {
    show: "untilRegistrationCloses",
    q: "How do I apply?",
    a: "Register for the hackathon, build your agentic strategy in Condor, then open a team and hit Apply to Drive. Rank the teams you want to race for — one strategy can apply to multiple teams. Applications close on **{{registrationEnd}}**, and teams start picking their drivers well before then, so apply early to be in the running.",
  },
  {
    show: "always",
    q: "What are the agent constraints?",
    a: "Each agent is a runnable agentic strategy — either a **Hummingbot V2 Controller** or a **Condor Agent**. Hackathon participants should submit a strategy with code, a description, and a demo video.",
  },
  {
    show: "always",
    q: "Which exchanges are eligible?",
    a: "Agents may trade on the following venues:\n{{eligibleExchanges}}",
  },
  {
    show: "always",
    q: "How are agents scored?",
    a: "Once the race begins, the Botcamp team runs each agent as a **dedicated Docker instance with {{startingCapital}} in starting capital** — participants aren't risking their own funds.\n\nEach agent is then scored on three metrics, and a team's overall standing sums the scores of its {{agentsPerTeam}}:\n{{scoringCriteria}}",
  },
  {
    show: "always",
    q: "How is volume measured?",
    a: "Gross filled notional, both legs — leveraged perp notional counts at full face value. Sponsors may have different preferences for spot vs. perp agents; we'll share more detail on that in upcoming workshops.",
  },
  {
    show: "always",
    q: "Are the scoring metrics rank-normalized or absolute?",
    a: "Rank-normalized. On P&L and Volume, the top agent gets the maximum points and the lowest gets 1. {{voteRule}}. Your total score = {{multiplierPnl}} × P&L points + {{multiplierVolume}} × Volume points + {{multiplierVote}} × Vote points.",
  },
  {
    show: "always",
    q: "What about self-trading, or crosses between agents from the same entrant?",
    a: "Crosses between two different agents are counted normally. Self-trading isn't possible, and the same entrant landing two race seats shouldn't happen either — Botcamp and sponsors vet all submitted agents during the selection and judging process.",
  },
  {
    show: "always",
    q: "Who pays trading fees, and at what rate?",
    a: "Fees are charged to each agent's {{startingCapital}} starting capital. For Solana, Derive, and XRPL, agents run in new dedicated wallets; for Gate and Bitget, they run in sub-accounts under the Hummingbot Foundation account. We're in conversation with Gate and Bitget about reduced fees for these accounts.",
  },
  {
    show: "always",
    q: "Can an agent see the live leaderboard or other agents during the race?",
    a: "No. Agents can't access the state of other agents during the competition. Botcamp monitors agent status throughout the race and may restart an agent if needed to keep the competition fair.",
  },
  {
    show: "untilRaceStarts",
    q: "Can I keep revising my agent while sponsors are selecting?",
    a: "Yes, for agents you've already submitted. New applications must come in before **{{registrationEnd}}**, but once you've submitted, we'll give feedback on your strategy just like we do for cohort strategies, and you can act on it. Even after a team picks your agent, you can keep improving its code — an agent holding a finals seat stays editable past the submission deadline, until **{{finalsCodeFreeze}}, 00:00 UTC**.",
  },
  {
    show: "always",
    q: "What happens to open positions at the end of the {{raceHours}}-hour race?",
    a: "All open positions are closed at the end of the {{raceHours}}-hour period, and the resulting P&L counts toward each agent's final score.",
  },
  {
    show: "always",
    q: "Can I modify the agent after code freeze?",
    a: "Only if it holds a finals seat. Code freezes when submissions close on **{{registrationEnd}}**. From then on, a submitted agent without a seat is **locked**. If a team selected your agent, or Botcamp placed it in a seat, you can keep editing its code and `strategy.md` until **{{finalsCodeFreeze}}, 00:00 UTC**, {{codeFreezeHours}} hours before the finals. After that, every agent is locked for the race.",
  },
  {
    show: "always",
    q: "Is the strategy code public?",
    a: "Yes. All agent code is public, in keeping with the open-source nature of the Hummingbot framework.",
  },
  {
    show: "untilRaceStarts",
    q: "Can I apply to multiple Teams?",
    a: "Yes. A single strategy can apply to as many teams as you want — rank your team preferences in the application, and every team you rank can review it. **Each team defines its own selection criteria**, so order your preferences around the teams that fit your strategy best. You can also submit additional strategies as separate applications.",
  },
  {
    show: "always",
    q: "What fees and rebates will the Gate finalist account actually receive?",
    a: "The Gate finalist account runs as a sub-account under the Hummingbot Foundation's Gate account, paying standard trading fees. We're in discussions with Gate about a fee discount for competition sub-accounts; this answer will be updated once that's confirmed.",
  },
  {
    show: "always",
    q: "How is Meteora and Orca LP volume credited?",
    a: "Volume for LP positions is based on the trading volume the position generates, calculated from the fees it earns while active.",
  },
  {
    show: "always",
    q: "How are LP positions and fees valued at the finish?",
    a: "P&L for LP positions is calculated from the net tokens added and removed — including fees earned and gas costs — converted to the quote token at the time the position is removed. This mirrors how P&L is calculated for LP Executors in Hummingbot.",
  },
  {
    show: "always",
    q: "How are raw P&L, volume, and votes converted into points?",
    a: "On P&L and Volume, agents are ranked from 1 to {{agents}}, with the top agent earning {{agents}} points and the lowest earning 1. {{voteRule}}. Final score = {{multiplierPnl}} × P&L points + {{multiplierVolume}} × Volume points + {{multiplierVote}} × HBOT Vote points (so P&L and Volume are {{weightPnl}} each of the score, and the vote {{weightVote}}). An agent that hasn't traded (no volume) scores 0 on every criterion, its team's vote points included, and ranks below every agent that has.",
  },
  {
    show: "always",
    q: "How does HBOT voting work?",
    a: "HBOT holders vote on [Snapshot]({{snapshotUrl}}) by spreading their HBOT voting power across the teams — not individual agents. Give more weight to the teams you like most: back one team with all of it, or split it across several. Use the **Vote on Snapshot** button below the leaderboard.\n\n{{votingWindow}}\n\nTeams are ranked by the total HBOT voting power each has received. The top team earns {{topVotePoints}} vote points, the next one {{voteStep}} fewer, and so on. Each of a team's agents carries those points, which count for {{weightVote}} of each agent's score.\n\n**The leaderboard follows the running tally.** Vote points move as votes land on Snapshot, and the Vote column shows each team's HBOT so far. They're final once the vote closes, and the leaderboard settles into its final standings.",
  },
  {
    show: "always",
    q: "Which Gateway version and connector will Botcamp use for Meteora?",
    a: "Botcamp will use the development version of Gateway, which includes bug fixes (PRs #675 and #676) and adds support for Meteora DAMM v2-based strategies. Building these strategies in Condor is covered in the Meteora sponsor workshop.",
  },
]
