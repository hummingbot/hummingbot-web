/**
 * The starter agent: a complete, minimal example agent in the layout Condor
 * installs, offered as a download on the Create Condor Agent page so a
 * builder starting from nothing gets every file in the right place.
 *
 *   example_pmm_agent/
 *     README.md                                          what each file does
 *     AGENT.md                                           name, description, agent_key, tools
 *     shutdown.md                                        what a wind-down closes (on_kill_switch)
 *     loops/main/loop.md                                 skills, default_config (bot_name, capital)
 *     skills/pmm_operator/SKILL.md                       how the loop runs the controller
 *     controllers/example_pmm/example_pmm.py             Hummingbot V2 controller
 *     controllers/example_pmm/CONTROLLER.md              its type and description
 *     controllers/example_pmm/sample_configs/default.yml its config (connector, pair, capital)
 *     routines/                                          optional helper scripts
 *
 * Only controllers/, loops/, routines/, skills/ and root files make it into
 * Condor (condorLeavesOut in agent-package.ts), so there is no conf/ and no
 * loops/<loop>/config.yml. Controllers use Condor's controllers/<name>/
 * folder, the only one it discovers. agent-starter-package.test.ts keeps the
 * package passing validateAgentPackage.
 *
 * The strategy is deliberately plain — a two-sided market maker, the same
 * shape as Hummingbot's stock pmm_simple — so the package shows how the
 * pieces connect rather than how to win.
 *
 * Pure. The file templates take their values from `StarterAgentValues`, so a
 * hackathon starter kit can build the same agent with the race's values
 * pinned and a README of its own.
 */

export const STARTER_AGENT_DIR = "example_pmm_agent"
export const STARTER_CONTROLLER = "example_pmm"
export const STARTER_SKILL = "pmm_operator"
const CONTROLLER_DIR = `controllers/${STARTER_CONTROLLER}`

export interface StarterPackageFile {
  path: string
  content: string
}

/** The values the example agent's files are written with. */
export interface StarterAgentValues {
  /** `agent_key`: the model Condor runs the agent's LLM on. */
  model: string
  /** `server_name`; null leaves it out, so the agent follows its owner's server. */
  serverName: string | null
  botName: string
  connector: string
  pair: string
  capital: number
  /** The sample config's style name; Condor uploads it as `<controller>__<style>`. */
  style: string
  positionMode: "HEDGE" | "ONEWAY"
  shutdownPolicy: "flatten_all" | "keep_spot_close_perp" | "keep_all"
}

// The generic download: Condor's default model, no server pinned, and a small
// spot market any Condor install can trade.
export const STARTER_AGENT_DEFAULTS: StarterAgentValues = {
  model: "claude-acp:sonnet",
  serverName: null,
  botName: "example-pmm",
  connector: "binance",
  pair: "BTC-USDT",
  capital: 100,
  style: "default",
  positionMode: "ONEWAY",
  shutdownPolicy: "flatten_all",
}

/** What each file in the package is, in the order the README lists them. */
export function starterAgentFileRoles(v: StarterAgentValues): Array<{ path: string; role: string }> {
  return [
    { path: "AGENT.md", role: "The agent: name, description, model, tools, and the strategy in prose" },
    { path: "shutdown.md", role: "What a wind-down closes, then a cleanup pass for the LLM" },
    { path: "loops/main/loop.md", role: "What the LLM does every tick, the skills it reads, and its default_config" },
    { path: `skills/${STARTER_SKILL}/SKILL.md`, role: "Know-how the loop reads: how to deploy, run and judge the controller" },
    { path: `${CONTROLLER_DIR}/${STARTER_CONTROLLER}.py`, role: "The Hummingbot V2 controller that places the orders" },
    { path: `${CONTROLLER_DIR}/CONTROLLER.md`, role: "The controller's type: and description" },
    {
      path: `${CONTROLLER_DIR}/sample_configs/${v.style}.yml`,
      role: "The controller's config: market, spreads, sizing, barriers",
    },
    { path: "routines/", role: "Optional Python helpers the loop can call" },
  ]
}

function agentMd(v: StarterAgentValues): string {
  return `---
name: Example PMM Agent
description: >-
  Example agent. Runs one two-sided market making controller on ${v.pair}
  and keeps it healthy, within its capital.
agent_key: ${v.model}
tools:
- get_market_data
- get_portfolio_overview
- manage_agent_controllers
- manage_controllers
- manage_bots
- trading_agent_journal_read
- trading_agent_journal_write
- send_notification
when_to_consult: When the user asks about the example market maker — its quotes,
  fills, inventory, or whether it is healthy.
server_required: true
${v.serverName ? `server_name: ${v.serverName}\n` : ""}---

# Example PMM Agent

One loop (\`main\`) supervises one Hummingbot V2 controller, \`${STARTER_CONTROLLER}\`,
which quotes both sides of ${v.pair} on \`${v.connector}\`.

## Capital

The whole agent trades $${v.capital}: the loop's \`total_amount_quote\` is the
envelope, and \`${CONTROLLER_DIR}/sample_configs/${v.style}.yml\` uses all of it. If
you add controllers, split the $${v.capital} between their configs — together
they must not exceed it.

## Division of labor

- The **controller** places and refreshes orders, every tick, deterministically.
- The **loop** (the LLM) checks health every few minutes, journals, and alerts
  a human. It never places orders itself.
- **\`shutdown.md\`** decides what is closed when the agent is shut down
  (\`${v.shutdownPolicy}\`), so nothing is left open with nobody watching it.
`
}

function loopMd(v: StarterAgentValues): string {
  return `---
name: Main
description: Keeps the ${STARTER_CONTROLLER} bot running and healthy, and journals each tick.
agent_key: ${v.model}
skills: [${STARTER_SKILL}]
default_config:
  frequency_sec: 300
  execution_mode: loop
  restart_on_boot: true
  bot_mode: bot
  bot_name: ${v.botName}
  total_amount_quote: ${v.capital}
  risk_limits:
    max_position_size_quote: ${v.capital}
    max_drawdown_pct: 10
---

# Main loop

Every tick, in order:

1. **Read the book.** \`get_portfolio_overview\` (equity, positions) and
   \`manage_bots(action="status")\`.
2. **Keep the bot alive** (skill \`${STARTER_SKILL}\`): if no bot named \`${v.botName}\`
   is running, deploy it once from the \`${v.style}\` style of \`${STARTER_CONTROLLER}\`
   (the skill has the steps). If it is running, adopt it — never start a second copy.
3. **Check health** against the skill's "Healthy vs broken" list.
4. **Risk:** if drawdown reaches \`max_drawdown_pct\`, stop the bot, journal why,
   and \`send_notification\` to the human.
5. **Journal** one line: status, both sides quoted or not, P&L, inventory.
`
}

function skillMd(v: StarterAgentValues): string {
  const configName = `${STARTER_CONTROLLER}__${v.style}`
  return `---
name: ${STARTER_SKILL}
description: Runs the ${STARTER_CONTROLLER} Hummingbot V2 controller — two-sided maker quotes on ${v.pair}.
when_to_use: Any tick that deploys, checks, or judges the health of the ${v.botName} bot.
---

# PMM operator (${STARTER_CONTROLLER})

## What it trades
Bot \`${v.botName}\`, running controller \`${STARTER_CONTROLLER}\`
(\`${CONTROLLER_DIR}/${STARTER_CONTROLLER}.py\`) with its \`${v.style}\` style
(\`${CONTROLLER_DIR}/sample_configs/${v.style}.yml\`) on \`${v.connector}\` ${v.pair}.

## Deploying
1. \`manage_agent_controllers(action="status", name="${STARTER_CONTROLLER}")\` — \`missing\`
   means \`sync\` it first; \`drift\` means stop and tell the human.
2. \`manage_agent_controllers(action="upload_config", name="${STARTER_CONTROLLER}", sample="${v.style}")\`
   saves the style on the server as \`${configName}\`.
3. \`manage_bots(action="deploy", bot_name="${v.botName}", controllers_config=["${configName}"],
   max_global_drawdown_quote=<max_drawdown_pct of ${v.capital}>)\` — the loss cap is required.

## Entries
One LIMIT buy and one LIMIT sell at \`buy_spreads\` / \`sell_spreads\` from mid,
refreshed every \`executor_refresh_time\` seconds.

## Sizing
\`total_amount_quote\` (${v.capital}) split across the levels by
\`buy_amounts_pct\` / \`sell_amounts_pct\`. Each level must clear the venue's
minimum order size.

## TP / SL
Each fill gets a triple barrier: \`take_profit\`, \`stop_loss\`, \`time_limit\`.

## Healthy vs broken
- Healthy: both sides quoted, fills on both sides, inventory within one level.
- Broken: one side missing for several ticks, repeated rejects, the bot restarting.

## When to stop
Only on the loop's drawdown limit or when a human asks.
`
}

// Condor reads the frontmatter as the deterministic wind-down and hands the
// body to the LLM as a cleanup pass on top (condor/agents/shutdown.py). At the
// agent's root it covers every loop; loops/<loop>/shutdown.md overrides it.
function shutdownMd(v: StarterAgentValues): string {
  return `---
on_kill_switch: ${v.shutdownPolicy}   # flatten_all | keep_spot_close_perp | keep_all
cancel_open_orders: true
---
# Wind-down

The deterministic wind-down has already applied the policy above: it stopped
this session's executors, closed what the policy says to close, and cancelled
this session's resting orders. You are the cleanup pass on top of it.

- Read the \`cancel_open_orders=\` line in the state above. Anything it reports
  as LEFT RESTING or UNKNOWN is still on the venue — cancel those, and only those.
- If any position the policy says to close is still open on \`${v.connector}\`
  ${v.pair}, close it (stop its executor with keep_position off, or a
  reduce-only order). Leave spot dust under ~$5.
- \`send_notification\` to the human with the final realized P&L and what you
  closed. If anything is still open, say so first.

Be quick — the safety-critical work is already done.
`
}

function controllerMd(v: StarterAgentValues): string {
  return `---
type: market_making
description: Example two-sided market maker around mid; one PositionExecutor per spread level with TP/SL/time-limit barriers.
---

# ${STARTER_CONTROLLER}

The same shape as Hummingbot's stock \`pmm_simple\`, renamed so it never
overwrites the stock controller on the host.

## Styles

| Style | Market | Capital |
|---|---|---|
| \`${v.style}\` | \`${v.connector}\` ${v.pair} | $${v.capital} |
`
}

function sampleConfigYml(v: StarterAgentValues): string {
  return `controller_name: ${STARTER_CONTROLLER}
controller_type: market_making
connector_name: ${v.connector}
trading_pair: ${v.pair}
total_amount_quote: ${v.capital}
buy_spreads: [0.002]
sell_spreads: [0.002]
buy_amounts_pct: [1]
sell_amounts_pct: [1]
executor_refresh_time: 60
cooldown_time: 15
leverage: 1
# Perps only, and set for the whole account on this connector — agents
# sharing an account must agree on it.
position_mode: ${v.positionMode}
stop_loss: 0.01
take_profit: 0.004
time_limit: 1800
take_profit_order_type: LIMIT
`
}

// A renamed copy of the shape of Hummingbot's stock pmm_simple, so it never
// overwrites the stock controller on the host.
function controllerPy(v: StarterAgentValues): string {
  return `from decimal import Decimal
from typing import List

from hummingbot.data_feed.candles_feed.data_types import CandlesConfig
from hummingbot.strategy_v2.controllers.market_making_controller_base import (
    MarketMakingControllerBase,
    MarketMakingControllerConfigBase,
)
from hummingbot.strategy_v2.executors.position_executor.data_types import PositionExecutorConfig


class ExamplePMMConfig(MarketMakingControllerConfigBase):
    """Every field comes from sample_configs/${v.style}.yml — spreads, amounts, barriers, leverage."""

    controller_name: str = "${STARTER_CONTROLLER}"
    candles_config: List[CandlesConfig] = []


class ExamplePMMController(MarketMakingControllerBase):
    """Two-sided market maker: one position executor per spread level.

    The base class handles the levels, refresh, and cooldown; this only says
    what each level's order looks like.
    """

    def __init__(self, config: ExamplePMMConfig, *args, **kwargs):
        super().__init__(config, *args, **kwargs)
        self.config = config

    def get_executor_config(self, level_id: str, price: Decimal, amount: Decimal):
        trade_type = self.get_trade_type_from_level_id(level_id)
        return PositionExecutorConfig(
            timestamp=self.market_data_provider.time(),
            level_id=level_id,
            connector_name=self.config.connector_name,
            trading_pair=self.config.trading_pair,
            entry_price=price,
            amount=amount,
            triple_barrier_config=self.config.triple_barrier_config,
            leverage=self.config.leverage,
            side=trade_type,
        )
`
}

function readme(v: StarterAgentValues): string {
  const table = starterAgentFileRoles(v)
    .map(({ path, role }) => `| \`${path}\` | ${role} |`)
    .join("\n")
  return `# Starter Agent

\`${STARTER_AGENT_DIR}/\` is a complete example agent in the layout Condor
installs: an LLM loop supervising a Hummingbot V2 market making controller.
Read it file by file, then replace the strategy with yours and keep the
structure.

## The files, and what each one does

| File | What it is |
|---|---|
${table}

How they connect: \`loop.md\` lists the skill in \`skills:\`; the controller's
folder name, file name and every config's \`controller_name\` are the same
(\`${STARTER_CONTROLLER}\`); the skill uploads the \`${v.style}\` style to the
server as \`${STARTER_CONTROLLER}__${v.style}\` and deploys the bot named
\`bot_name\` with it.

Condor installs only \`controllers/\`, \`loops/\`, \`routines/\`, \`skills/\`
and files at the top of the folder. Anything else — a \`conf/\` folder, a
loop's \`config.yml\`, \`tests/\` — is left out when you upload, so keep
controller configs in \`sample_configs/\`. Never name a style \`config\`.

## Make it yours

1. **Rename the folder** to your agent's slug, and set \`name\`, \`description\`,
   \`agent_key\` and the strategy text in \`AGENT.md\`.
2. **Write your controller** in \`controllers/<name>/<name>.py\`, with a
   \`CONTROLLER.md\` saying its \`type:\` (\`generic\`, \`market_making\`, or
   \`directional_trading\`) and a \`sample_configs/<style>.yml\` whose
   \`controller_name\` is \`<name>\`. Delete \`${STARTER_CONTROLLER}\` when you no
   longer need it.
3. **Write the loop** in \`loops/main/loop.md\`: what to check and decide each
   tick, its \`bot_name\` and \`total_amount_quote\`. Add more loops under
   \`loops/<loop>/\` if you need them.
4. **Write a skill per controller** in \`skills/<skill>/SKILL.md\` and list it in
   the loop's \`skills:\`.
5. **Set the market and capital** in each \`sample_configs/<style>.yml\`
   (\`connector_name\`, \`trading_pair\`, \`total_amount_quote\`). Together the
   configs you deploy must stay within the loop's \`total_amount_quote\`.
6. **Leave \`server_name\` out** of AGENT.md unless the agent must always run on
   one server: without it, the agent follows its owner's server.

## Before you submit

- [ ] \`AGENT.md\` has a \`name\` and a \`description\` (the description becomes the summary)
- [ ] Every controller is \`controllers/<name>/<name>.py\`, and its configs' \`controller_name\` is \`<name>\`
- [ ] Every skill in a loop's \`skills:\` has its \`skills/<skill>/SKILL.md\`
- [ ] \`shutdown.md\` is at the top of the folder
- [ ] Nothing outside \`controllers/\`, \`loops/\`, \`routines/\`, \`skills/\` and top-level files
- [ ] Text files only: Markdown, YAML, Python, JSON
- [ ] No API keys, secrets, \`.env\` files, private keys or wallet recovery phrases anywhere

## How to submit

On Botcamp, go to **My Strategies → Create Condor Agent** and drop this
folder in (the folder itself, not a zip). It's checked before anything is
created, then reviewed before Condor can clone it. You can also publish it
straight from Condor once you've connected your Botcamp account there.
`
}

/**
 * Every file in the starter agent, under STARTER_AGENT_DIR/. Pass `readmeMd`
 * to replace the generic README (a hackathon's starter kit has its own).
 */
export function buildStarterAgent(
  values: StarterAgentValues = STARTER_AGENT_DEFAULTS,
  readmeMd: string = readme(values),
): StarterPackageFile[] {
  return [
    { path: "README.md", content: readmeMd },
    { path: "AGENT.md", content: agentMd(values) },
    { path: "shutdown.md", content: shutdownMd(values) },
    { path: "loops/main/loop.md", content: loopMd(values) },
    { path: `skills/${STARTER_SKILL}/SKILL.md`, content: skillMd(values) },
    { path: `${CONTROLLER_DIR}/${STARTER_CONTROLLER}.py`, content: controllerPy(values) },
    { path: `${CONTROLLER_DIR}/CONTROLLER.md`, content: controllerMd(values) },
    { path: `${CONTROLLER_DIR}/sample_configs/${values.style}.yml`, content: sampleConfigYml(values) },
  ].map((f) => ({ ...f, path: `${STARTER_AGENT_DIR}/${f.path}` }))
}

/** Folders the package ships empty, so the layout is visible on unzip. */
export const STARTER_EMPTY_DIRS = [`${STARTER_AGENT_DIR}/routines/`]
