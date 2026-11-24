/**
 * The hackathon's downloadable starter package: the site's starter agent
 * (src/lib/agent-starter-package.ts) with the starter kit's race values
 * pinned — model, host, bot name, market, capital, position mode, shutdown
 * policy — and a README that walks through every file and the race's rules.
 *
 * The files themselves are the starter agent's, so the race's example and the
 * one offered on Create Condor Agent can't drift apart; only the values and
 * the README differ. Values the kit can't know (the builder's host, team, and
 * agent) stay as <placeholders> unless the route passes them for a builder
 * holding a seat.
 *
 * Pure — the download route zips what this returns.
 */

import { SCORING_CRITERIA } from "@/botcamp/lib/hackathon-squads"
import { renderBotName, type StarterKit } from "@/botcamp/lib/hackathon-starter-kit"
import {
  STARTER_AGENT_DIR,
  STARTER_CONTROLLER,
  STARTER_EMPTY_DIRS,
  STARTER_SKILL,
  STARTER_STRUCTURE_CHECKLIST,
  STARTER_STRUCTURE_SECTION,
  buildStarterAgent,
  type StarterAgentValues,
  type StarterPackageFile,
} from "@/botcamp/lib/agent-starter-package"

export { STARTER_AGENT_DIR, STARTER_EMPTY_DIRS, type StarterPackageFile }

const CONTROLLER = STARTER_CONTROLLER
const SKILL = STARTER_SKILL
// The sample config's style name. Condor uploads it as `example_pmm__race`.
const STYLE = "race"
const CONFIG_NAME = `${CONTROLLER}__${STYLE}`
const CONTROLLER_DIR = `controllers/${CONTROLLER}`
// Used when the kit allows any pair, so the example still runs as-is.
const EXAMPLE_PAIR = "BTC-USDT"

export interface StarterPackageOptions {
  hackathonTitle: string
  startingCapital: number
  serverName?: string
  team?: string
  agent?: string
}

const PLACEHOLDER = {
  serverName: "<your assigned host>",
  team: "<team-slug>",
  agent: "<agent-slug>",
  model: "<an approved model>",
}

function readme(kit: StarterKit, opts: StarterPackageOptions, p: StarterAgentValues): string {
  const models =
    kit.approvedModels.length > 0
      ? kit.approvedModels.map((m) => `- \`${m}\``).join("\n")
      : "- Announced before the race — check the Resources page."
  const markets =
    kit.markets.length > 0
      ? kit.markets
          .map(
            (m) =>
              `- **${m.venue}** — ${m.connectors.map((c) => `\`${c}\``).join(", ")} · ${
                m.pairs.length > 0 ? m.pairs.join(", ") : "any pair"
              }`,
          )
          .join("\n")
      : "- Announced before the race — check the Resources page."
  const scoring = SCORING_CRITERIA.map((c) => `- ${c.label}: ${c.weight}%`).join("\n")
  const support = kit.supportUrl ? `[${kit.supportLabel || kit.supportUrl}](${kit.supportUrl})` : kit.supportLabel

  return `# ${opts.hackathonTitle} — Starter Kit

\`${STARTER_AGENT_DIR}/\` is a complete example agent in the layout Condor
installs: an LLM loop supervising a Hummingbot V2 market making controller.
Every race value is already pinned. Read it file by file, then replace the
strategy with yours and keep the structure.

## The files, and what each one does

| File | What it is | Race values in it |
|---|---|---|
| \`AGENT.md\` | The agent: name, model, tools, host, and the strategy in prose | \`agent_key\`, \`server_name\` |
| \`shutdown.md\` | What a wind-down closes, then a cleanup pass for the LLM | \`on_kill_switch\` |
| \`loops/main/loop.md\` | What the LLM does every tick, the skills it uses, and its \`default_config\` | \`agent_key\`, \`bot_name\`, \`total_amount_quote\` |
| \`skills/${SKILL}/SKILL.md\` | Know-how the loop reads: how to deploy, run and judge the controller | — |
| \`${CONTROLLER_DIR}/${CONTROLLER}.py\` | The Hummingbot V2 controller that places the orders | — |
| \`${CONTROLLER_DIR}/CONTROLLER.md\` | The controller's \`type:\` and description | — |
| \`${CONTROLLER_DIR}/sample_configs/${STYLE}.yml\` | The controller's config: market, spreads, sizing, barriers | \`connector_name\`, \`trading_pair\`, \`total_amount_quote\`, \`position_mode\` |
| \`routines/\` | Optional Python helpers the loop can call | — |
| \`docs/README.md\` | This file. Notes for people — Condor never loads \`docs/\` | — |

How they connect: \`loop.md\` lists the skill in \`skills:\`; the controller's
folder name, file name and every config's \`controller_name\` are the same
(\`${CONTROLLER}\`); the skill uploads the \`${STYLE}\` style to the host as
\`${CONFIG_NAME}\` and deploys the bot named \`bot_name\` with it.

${STARTER_STRUCTURE_SECTION}

## The values every agent uses

**Model** (\`agent_key\`)${kit.llmProvider ? ` — ${kit.llmProvider}` : ""}
${models}

**Host** (\`server_name\`): \`${p.serverName}\`
Finalists see their assigned host on their hackathon dashboard. Never \`local\` or blank.

This is the one place the kit goes against Condor's own advice. Condor says to
leave \`server_name\` empty ("follow the owner's server"), because naming a
server pins the agent — and every loop it deploys — to it for good. For the race
that pin is the point: the race host is the one that holds the race account and
gets scored, and an agent that follows whatever server its owner has as default
can end up trading somewhere else. After the race, clear it (or change it from
the agent's page in Condor) to run the agent anywhere. Publishing from Condor
leaves \`server_name\` out of the package, so it is set again when the agent is
deployed on the race host.

**Venues and pairs** (\`connector_name\` / \`trading_pair\`)
${markets}

**Starting capital**: $${p.capital} per agent. The loop's \`total_amount_quote\`
is the whole envelope; your controller configs split it and together must not
exceed ${p.capital}.

**Position mode** (\`position_mode\`, perps): \`${p.positionMode}\`
It's set for the whole account on a connector, not per bot, so every agent on
a race account must use the same one.

**Shutdown** (\`on_kill_switch\` in \`shutdown.md\`): \`${p.shutdownPolicy}\`
What a wind-down closes when the agent is shut down — at the end of the race,
on a risk breach, or by an organizer. Last edition, agents were left holding
funded positions with nobody watching them; keep this file in your package.

**Bot name** (\`bot_name\`): \`${p.botName}\`
Pattern: \`${kit.botNamePattern}\` — {team} is your team's slug, {agent} your strategy's slug.

**Scoring**
${scoring}
${kit.notes ? `\n## Notes\n\n${kit.notes}\n` : ""}
## Make it yours

1. **Rename the folder** to your agent's slug, and set \`name\`, \`description\`,
   and the strategy text in \`AGENT.md\`.
2. **Write your controller** in \`controllers/<name>/<name>.py\`, with a
   \`CONTROLLER.md\` saying its \`type:\` (\`generic\`, \`market_making\`, or
   \`directional_trading\`) and a \`sample_configs/<style>.yml\` whose
   \`controller_name\` is \`<name>\`. Delete \`${CONTROLLER}\` when you no
   longer need it.
3. **Write the loop** in \`loops/main/loop.md\`: what to check and decide each
   tick. Add more loops under \`loops/<loop>/\` if you need them.
4. **Write a skill per controller** in \`skills/<skill>/SKILL.md\` and list it in
   the loop's \`skills:\`.
5. **Keep the pinned values** — \`agent_key\`, \`server_name\`, \`bot_name\`,
   \`connector_name\`, \`trading_pair\`, \`total_amount_quote\`,
   \`position_mode\`, and \`shutdown.md\` must match the kit above.

## Before you submit

- [ ] \`agent_key\` is an approved model, in AGENT.md and every loop.md
- [ ] \`server_name\` is your assigned host (finalists), never \`local\` or blank
- [ ] Every \`connector_name\` and \`trading_pair\` is on the allowed list
- [ ] Capital across every \`sample_configs/*.yml\` you deploy stays within $${p.capital}
- [ ] Every perp config uses \`position_mode: ${p.positionMode}\`
- [ ] \`shutdown.md\` is at the top of the folder with \`on_kill_switch: ${p.shutdownPolicy}\`
- [ ] \`bot_name\` follows \`${kit.botNamePattern}\`
- [ ] Every controller is \`controllers/<name>/<name>.py\`, and its configs' \`controller_name\` is \`<name>\`
- [ ] Every skill in a loop's \`skills:\` has its \`skills/<skill>/SKILL.md\`
${STARTER_STRUCTURE_CHECKLIST}
- [ ] No API keys, secrets, \`.env\` files, private keys or wallet recovery phrases anywhere

## How to submit

On Botcamp, go to **My Strategies → Create Condor Agent** and drop this
folder in (the folder itself, not a zip); a new version of an agent you
already have goes in its **Condor Agent Package** card. Each upload is
checked and reviewed before it can be installed. You can also publish it straight from
Condor once you've connected your Botcamp account there.

## Support

${support || "See the Resources page."}
`
}

/** Every file in the starter package, under STARTER_AGENT_DIR/. */
export function buildStarterPackage(kit: StarterKit, opts: StarterPackageOptions): StarterPackageFile[] {
  const market = kit.markets[0]
  const values: StarterAgentValues = {
    model: kit.approvedModels[0] ?? PLACEHOLDER.model,
    // The race pins the host: it holds the race account and gets scored.
    serverName: opts.serverName ?? PLACEHOLDER.serverName,
    botName: renderBotName(kit.botNamePattern, {
      team: opts.team ?? PLACEHOLDER.team,
      agent: opts.agent ?? PLACEHOLDER.agent,
    }),
    connector: market?.connectors[0] ?? "<connector>",
    pair: market?.pairs[0] ?? EXAMPLE_PAIR,
    capital: opts.startingCapital,
    style: STYLE,
    positionMode: kit.positionMode,
    shutdownPolicy: kit.shutdownPolicy,
  }
  return buildStarterAgent(values, readme(kit, opts, values))
}
