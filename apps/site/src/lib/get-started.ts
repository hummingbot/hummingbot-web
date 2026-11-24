/**
 * The "Get started with Hummingbot" guide: from nothing to a running bot.
 *
 * One source for two outputs, so they never drift apart:
 *  - /get-started renders it as a page (components/get-started/*);
 *  - /get-started.md renders it as plain Markdown for AI assistants
 *    (`guideToMarkdown` below), which llms.txt points to.
 *
 * Inline text is a tiny Markdown subset: `code`, **bold** and [text](url).
 * Facts come from the Hummingbot client quickstart, Condor's "Installing"
 * and "Credentials" docs, and hummingbot/deploy's setup.sh (Nov 2026).
 */

export const SITE_URL = "https://hummingbot.org";

/** The installer that works today (hummingbot/deploy main, setup.sh). */
export const CONDOR_INSTALL_URL = `${SITE_URL}/install-condor.sh`;
export const CONDOR_SCRIPT_SOURCE = "https://github.com/hummingbot/deploy/blob/main/setup.sh";

export type GuidePath = "condor" | "client";
export type GuideOs = "mac" | "linux" | "windows";

export const OS_LABEL: Record<GuideOs, string> = { mac: "macOS", linux: "Linux", windows: "Windows" };

export type Block =
  | { kind: "p"; text: string }
  | { kind: "cmd"; lines: string[]; caption?: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "note"; tone: "tip" | "warn"; text: string }
  | { kind: "os"; mac: Block[]; linux: Block[]; windows: Block[] }
  | { kind: "faq"; items: { q: string; a: Block[] }[] };

export type Step = {
  id: string;
  title: string;
  /** Shown under the title, for both paths. */
  intro?: Block[];
  condor?: Block[];
  client?: Block[];
  /** Shown after the path-specific part, for both paths. */
  outro?: Block[];
};

export const PATHS: Record<GuidePath, { name: string; tagline: string; pick: string; time: string }> = {
  condor: {
    name: "Condor",
    tagline: "Hummingbot in your browser, with AI agents",
    pick: "An app you use in the browser (or from Telegram). It installs Hummingbot for you, runs several bots at once and adds AI agents. Pick this if you'd rather click than type commands.",
    time: "About 30 minutes",
  },
  client: {
    name: "Hummingbot Client",
    tagline: "Hummingbot in the terminal",
    pick: "You type commands to create and run a bot. Pick this if you're comfortable in a terminal, want full manual control, or want to practice with simulated money before using a real account.",
    time: "About 20 minutes",
  },
};

export const GUIDE = {
  title: "Get started with Hummingbot",
  summary:
    "Hummingbot is free, open source software that runs automated trading strategies (bots) on crypto exchanges. It runs on your own computer or server and trades from your own exchange account, so your keys and your funds stay with you.",
};

/** Read by AI assistants first (top of the Markdown version and llms.txt). */
export const AI_INSTRUCTIONS = [
  "Follow this guide in order. Ask the user which path they want (Condor or Hummingbot Client) and which operating system they use before giving commands.",
  "Show one step at a time, explain what each command does, and wait for the user to confirm it worked before moving on.",
  "Never ask the user to paste exchange API keys, secrets, passwords or wallet private keys into the chat. They enter them only in Hummingbot (the Condor Workspace or `hbot connect`).",
  "Exchange API keys need read and trade permissions only. Never tell the user to enable withdrawals or transfers.",
  "Recommend starting with a small amount the user can afford to lose. Hummingbot is software, not financial advice.",
  "If a step fails, use the \"If something goes wrong\" section of this guide, and run `make doctor` (Condor) before guessing.",
];

const DOCKER_MAC: Block[] = [
  { kind: "p", text: "Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and open it. It has to be running whenever Hummingbot runs." },
  { kind: "p", text: "You also need the Mac's command line tools (git and make). If you've never installed them:" },
  { kind: "cmd", lines: ["xcode-select --install"] },
];
const DOCKER_WINDOWS: Block[] = [
  { kind: "p", text: "Hummingbot runs on Windows through **WSL2 with Ubuntu**. Open PowerShell as administrator, run this, then restart your computer:" },
  { kind: "cmd", lines: ["wsl --install -d Ubuntu"] },
  { kind: "p", text: "Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and, in its settings, turn on **Resources → WSL integration** for Ubuntu." },
  { kind: "note", tone: "warn", text: "From here on, run every command in the **Ubuntu** app (Start menu → Ubuntu), not in PowerShell." },
];

export const STEPS: Step[] = [
  {
    id: "requirements",
    title: "Check your computer",
    intro: [
      {
        kind: "list",
        items: [
          "**System:** macOS, Linux (Ubuntu 20.04 or newer, x64 or ARM), or Windows with WSL2.",
          "**Memory:** 4 GB of RAM at least, 8 GB recommended.",
          "**An exchange account** you want to trade on, such as Binance, OKX, Bybit, Kraken or Hyperliquid. See [all supported exchanges](/exchanges).",
        ],
      },
    ],
    condor: [
      { kind: "list", items: ["**Disk:** 10 GB free (20 GB recommended).", "**Docker**, installed and running (see below)."] },
      {
        kind: "os",
        mac: DOCKER_MAC,
        linux: [{ kind: "p", text: "Nothing to install first: the installer adds Docker, git and the other tools it needs if they're missing. It may ask for your password (`sudo`)." }],
        windows: DOCKER_WINDOWS,
      },
      { kind: "note", tone: "tip", text: "Want Condor to message you on Telegram? You can add that during install or later. Not needed to start." },
    ],
    client: [
      { kind: "list", items: ["**Disk:** 5 GB free for each bot.", "**Docker**, git and make (see below)."] },
      {
        kind: "os",
        mac: DOCKER_MAC,
        linux: [
          { kind: "p", text: "Install git, make and Docker:" },
          { kind: "cmd", lines: ["sudo apt update && sudo apt install -y git make", "curl -fsSL https://get.docker.com | sh", "sudo usermod -aG docker $USER"] },
          { kind: "p", text: "Close the terminal and open a new one so the last line takes effect." },
        ],
        windows: [...DOCKER_WINDOWS, { kind: "p", text: "Then, in Ubuntu, install git and make:" }, { kind: "cmd", lines: ["sudo apt update && sudo apt install -y git make"] }],
      },
    ],
  },
  {
    id: "install",
    title: "Install",
    condor: [
      { kind: "p", text: "Open a terminal, make an empty folder and run the installer in it:" },
      { kind: "cmd", lines: ["mkdir hummingbot && cd hummingbot", `curl -fsSL ${CONDOR_INSTALL_URL} | bash`] },
      {
        kind: "p",
        text: `Prefer to read the script before running it? [See its source on GitHub](${CONDOR_SCRIPT_SOURCE}), or download it, read it and then run it:`,
      },
      { kind: "cmd", lines: [`curl -fsSLo install-condor.sh ${CONDOR_INSTALL_URL}`, "less install-condor.sh", "bash install-condor.sh"] },
      { kind: "p", text: "**What the installer asks you**, and what to answer:" },
      {
        kind: "list",
        ordered: true,
        items: [
          "**Telegram or Local.** Choose **Local** if you're not sure: you'll use Condor in your browser and need nothing else. Telegram needs a bot token from [@BotFather](https://t.me/BotFather) and your user ID from [@userinfobot](https://t.me/userinfobot). You can switch later with `make setup`.",
          "**Tailscale.** Answer `n` on your own computer. Answer `y` only on a server you'll reach from elsewhere.",
          "**Pick an AI model now?** Optional. It's for Condor's AI agents; you can skip it and run `make pick-model` later. The first time, Condor downloads about 250 MB, which takes 1–3 minutes.",
          "**Configure and launch Hummingbot API?** Answer **yes**. This is the part that runs your Hummingbot bots.",
          "**Username, password and config password.** Choose your own and write them down. The config password encrypts your exchange keys and can't be changed later.",
        ],
      },
      { kind: "p", text: "When it finishes you'll have two folders, `condor/` and `hummingbot-api/`, and Condor running in the background." },
    ],
    client: [
      { kind: "p", text: "Open a terminal and run:" },
      { kind: "cmd", lines: ["git clone https://github.com/hummingbot/hummingbot.git", "cd hummingbot", "make setup", "make deploy", "make link-cli"] },
      {
        kind: "list",
        items: [
          "`make setup` asks whether to include **Gateway**. Answer `n` unless you want to trade on decentralized exchanges (DEXs).",
          "`make deploy` downloads Hummingbot and starts it in Docker.",
          "`make link-cli` adds the `hbot` command to your terminal.",
        ],
      },
    ],
  },
  {
    id: "verify",
    title: "Check that it works",
    condor: [
      { kind: "p", text: "Inside the `condor` folder, run the health check. It lists anything that's wrong:" },
      { kind: "cmd", lines: ["cd condor", "make doctor"] },
      {
        kind: "list",
        items: [
          "**Local mode:** open [http://localhost:8088](http://localhost:8088) in your browser. The Condor Workspace opens, already logged in.",
          "**Telegram mode:** send `/start` to your bot. It answers with its main commands.",
          "Either way you'll get a notification: **\"Condor is online and ready.\"**",
        ],
      },
    ],
    client: [
      { kind: "cmd", lines: ["hbot --version"] },
      { kind: "p", text: "You should see the Hummingbot version number. The first time you use `hbot` it asks you to create a password. It encrypts your exchange keys: write it down, there's no way to recover it." },
    ],
  },
  {
    id: "connect",
    title: "Connect your exchange",
    intro: [
      { kind: "p", text: "On your exchange's website, create an **API key**. That's what lets Hummingbot place orders for you." },
      {
        kind: "list",
        items: [
          "Turn on **read** and **trade** permissions only.",
          "**Never** turn on withdrawals or transfers.",
          "If the exchange lets you restrict the key to an IP address, use your computer's or server's IP.",
        ],
      },
      { kind: "p", text: "Each exchange's page has its own instructions: [find yours](/exchanges)." },
    ],
    condor: [
      {
        kind: "list",
        ordered: true,
        items: [
          "In the Workspace, open **Settings → Keys and Wallets**.",
          "Click **Add API Key** and choose **Spot** or **Perpetual**.",
          "Choose your exchange, paste the key and secret, and save. Condor checks the key by reading your balances.",
        ],
      },
      { kind: "note", tone: "tip", text: "**Hyperliquid** uses a wallet instead of a pasted key: choose **Connect Hyperliquid** and approve it from your browser wallet. Your wallet's private key never leaves it." },
    ],
    client: [
      { kind: "p", text: "Replace `binance` with your exchange. `--fields` shows what it will ask for:" },
      { kind: "cmd", lines: ["hbot connect binance --fields", "hbot connect binance", "hbot balance"] },
      { kind: "note", tone: "tip", text: "Want to practice first? Skip this step. In the next step you can run a bot with **simulated money** on real market prices, no keys needed." },
    ],
    outro: [{ kind: "note", tone: "warn", text: "Never paste your API keys or passwords into a chat, an email or an AI assistant. Enter them only in Hummingbot. The Hummingbot team will never ask for them." }],
  },
  {
    id: "first-bot",
    title: "Run your first bot",
    intro: [{ kind: "p", text: "Start with a small amount you'd be fine losing while you learn how the bot behaves." }],
    condor: [
      {
        kind: "list",
        ordered: true,
        items: [
          "Go to **Bots → Editor** and click **+ New config**. Pick a template, for example `pmm_mister` (market making) or `grid_strike` (grid trading), and set the exchange, trading pair and amount.",
          "Go to **Bots → Deploy bot**. Choose your config and the account `master_account`, and set a **Max global drawdown**: the bot stops if it loses that much.",
          "Watch it in the bot's KPIs and **Logs**.",
          "Click **Stop bot** when you're done.",
        ],
      },
      { kind: "p", text: "Or skip the setup: pick a ready-made strategy in the [Strategy Hub](/hub) and click **Clone to Condor**." },
    ],
    client: [
      { kind: "p", text: "**Practice with simulated money** (no exchange keys needed). This runs a simple market-making bot on Binance's real prices with a fake balance:" },
      {
        kind: "cmd",
        lines: [
          "hbot create simple_pmm --name practice.yml --set exchange=binance_paper_trade --set trading_pair=BTC-USDT",
          "hbot start",
          "hbot status",
        ],
      },
      { kind: "p", text: "`hbot status` shows your simulated balance and the orders the bot keeps on the market. Follow it live with `hbot logs -f` (Ctrl+C to stop watching) and stop the bot with `hbot stop`." },
      { kind: "p", text: "**With real money**, once your exchange is connected:" },
      { kind: "cmd", lines: ["hbot create simple_pmm --name live.yml --set exchange=binance --set trading_pair=BTC-USDT", "hbot start --replace"] },
      { kind: "p", text: "Next, try the strategies under [Strategies](/docs/strategies) or the ready-made ones in the [Strategy Hub](/hub)." },
    ],
  },
  {
    id: "manage",
    title: "Keep it running and up to date",
    condor: [
      { kind: "p", text: "Inside the `condor` folder:" },
      {
        kind: "list",
        items: [
          "`make status`: is Condor running?",
          "`make logs`: live logs (Ctrl+B, then D, to leave them running).",
          "`make restart`: stop and start again.",
          "`make doctor`: check the whole install.",
        ],
      },
      { kind: "p", text: "**To update**, run the installer again with `--upgrade` from the folder you installed in (the one that holds `condor/`), or use **Settings → Updates** in the Workspace:" },
      { kind: "cmd", lines: [`curl -fsSL ${CONDOR_INSTALL_URL} | bash -s -- --upgrade`] },
    ],
    client: [
      { kind: "p", text: "`hbot stop` stops the bot. To stop Hummingbot itself, run this inside the `hummingbot` folder:" },
      { kind: "cmd", lines: ["docker compose down"] },
      { kind: "p", text: "**To update**, inside the `hummingbot` folder:" },
      { kind: "cmd", lines: ["docker compose down", "docker pull hummingbot/hummingbot:latest", "docker compose up -d", "make link-cli"] },
      { kind: "p", text: "Prefer the classic full-screen interface? Run `docker attach hummingbot`. Press Ctrl+P, then Ctrl+Q, to leave it without stopping the bot." },
    ],
  },
  {
    id: "uninstall",
    title: "Uninstall",
    intro: [{ kind: "note", tone: "warn", text: "This deletes your saved exchange keys and bot history. Stop your bots first." }],
    condor: [
      { kind: "p", text: "From the folder that holds `condor/` and `hummingbot-api/`:" },
      { kind: "cmd", lines: ["(cd condor && make stop)", "(cd hummingbot-api && docker compose down -v)", "rm -rf condor hummingbot-api"] },
    ],
    client: [
      { kind: "p", text: "From the folder that holds `hummingbot/`:" },
      { kind: "cmd", lines: ["(cd hummingbot && docker compose down)", "docker rmi hummingbot/hummingbot", "rm -rf hummingbot"] },
    ],
    outro: [{ kind: "p", text: "Delete the API keys on your exchange's website too." }],
  },
  {
    id: "troubleshooting",
    title: "If something goes wrong",
    intro: [
      {
        kind: "faq",
        items: [
          {
            q: "\"Cannot connect to the Docker daemon\" or \"Docker is not running\"",
            a: [
              { kind: "p", text: "Open Docker Desktop and wait until it says it's running, then try again. On Linux:" },
              { kind: "cmd", lines: ["sudo systemctl start docker"] },
            ],
          },
          {
            q: "\"permission denied\" when using Docker (Linux)",
            a: [
              { kind: "cmd", lines: ["sudo usermod -aG docker $USER"] },
              { kind: "p", text: "Then close the terminal and open a new one." },
            ],
          },
          { q: "Commands fail on Windows", a: [{ kind: "p", text: "Run them in the **Ubuntu** app (WSL2), not in PowerShell or Command Prompt." }] },
          {
            q: "\"Address already in use\" (port 8088 or 8000)",
            a: [
              { kind: "p", text: "Another program is using that port. See which one, and close it:" },
              { kind: "cmd", lines: ["lsof -i :8088"] },
            ],
          },
          { q: "The install stops or gets \"Killed\"", a: [{ kind: "p", text: "Your machine ran out of memory. Hummingbot needs at least 4 GB of RAM; on a small server, add swap space or pick a bigger one." }] },
          {
            q: "My Telegram bot doesn't answer (Condor)",
            a: [
              { kind: "p", text: "Check `TELEGRAM_TOKEN` and `ADMIN_USER_ID` in `condor/.env`, then look for errors in Condor's session (Ctrl+B, then D, to leave it):" },
              { kind: "cmd", lines: ["tmux attach -t condor"] },
              { kind: "p", text: "New Telegram users get \"Access Request Submitted\" until the admin approves them." },
            ],
          },
          {
            q: "Saving an API key fails",
            a: [{ kind: "p", text: "Check that the key has read and trade permissions, that its IP allowlist includes your machine, and, on some exchanges, that websocket access is on." }],
          },
          {
            q: "Bots start but show no data (Condor)",
            a: [
              { kind: "p", text: "Reset the API's message broker, inside the `hummingbot-api` folder:" },
              { kind: "cmd", lines: ["make emqx-auth-reset"] },
            ],
          },
          {
            q: "\"CONFIG_PASSWORD does not match\" (Condor)",
            a: [{ kind: "p", text: "The config password can't be changed after install. Put the original back in `hummingbot-api/.env`. If it's lost, delete `hummingbot-api/bots/credentials/` and add your keys again." }],
          },
        ],
      },
      { kind: "p", text: "Still stuck? Search the [troubleshooting docs](/docs/troubleshooting) or ask in [Discord](https://discord.gg/hummingbot). Include what you ran and the error, but never your keys or passwords." },
    ],
  },
  {
    id: "risks",
    title: "Before you use real money",
    intro: [
      {
        kind: "list",
        items: [
          "**Bots can lose money.** Markets move fast, and a strategy that worked yesterday can lose today. Start small.",
          "**You pay exchange fees** on every trade, and each exchange has a minimum order size.",
          "**Set a loss limit.** In Condor, that's the bot's max drawdown.",
          "**Your keys stay on your machine**, encrypted with your password. Anyone who can use that machine can trade with them, so keep it secure.",
          "**Never share** keys, passwords or wallet private keys, including with AI assistants or with \"support\" messaging you first.",
        ],
      },
      { kind: "p", text: "Hummingbot is open source software provided as is, under the Apache 2.0 license. Nothing here is financial advice." },
    ],
  },
];

export const NEXT_STEPS: { label: string; href: string; body: string }[] = [
  { label: "Strategy Hub", href: "/hub", body: "Ready-made strategies and agents you can clone." },
  { label: "Botcamp", href: "/botcamp", body: "Courses and live cohorts, from basics to building your own strategy." },
  { label: "Docs", href: "/docs", body: "Everything in depth: strategies, connectors, Gateway, the API." },
  { label: "Community", href: "https://discord.gg/hummingbot", body: "Ask questions and share what you build, on Discord." },
];

/* ------------------------------------------------------------------ */
/* Markdown                                                             */
/* ------------------------------------------------------------------ */

const abs = (text: string) => text.replace(/\]\((\/[^)]*)\)/g, (_, p: string) => `](${SITE_URL}${p})`);

function blockToMd(b: Block): string {
  switch (b.kind) {
    case "p":
      return abs(b.text);
    case "cmd":
      return "```bash\n" + b.lines.join("\n") + "\n```";
    case "list":
      return b.items.map((it, i) => `${b.ordered ? `${i + 1}.` : "-"} ${abs(it)}`).join("\n");
    case "note":
      return `> **${b.tone === "warn" ? "Important" : "Tip"}:** ${abs(b.text)}`;
    case "os":
      return (["mac", "linux", "windows"] as const)
        .map((os) => `**On ${OS_LABEL[os]}:**\n\n${blocksToMd(b[os])}`)
        .join("\n\n");
    case "faq":
      return b.items.map((f) => `#### ${f.q}\n\n${blocksToMd(f.a)}`).join("\n\n");
  }
}

const blocksToMd = (blocks: Block[] = []) => blocks.map(blockToMd).join("\n\n");

/** The whole guide as Markdown, both paths, every OS: what /get-started.md serves. */
export function guideToMarkdown(): string {
  const out: string[] = [
    `# ${GUIDE.title}`,
    `> ${GUIDE.summary}`,
    `Source: ${SITE_URL}/get-started`,
    "## Instructions for AI assistants",
    AI_INSTRUCTIONS.map((t) => `- ${t}`).join("\n"),
    "## Choose how you'll use Hummingbot",
    (Object.keys(PATHS) as GuidePath[])
      .map((p) => `- **${PATHS[p].name}**: ${PATHS[p].tagline} (${PATHS[p].time.toLowerCase()}). ${PATHS[p].pick}`)
      .join("\n"),
    "Both run the same Hummingbot engine. Building your own app on top of Hummingbot? See the [Hummingbot API](" +
      `${SITE_URL}/docs/hummingbot-api). Trading on DEXs? See [Gateway](${SITE_URL}/docs/gateway).`,
  ];
  STEPS.forEach((s, i) => {
    out.push(`## ${i + 1}. ${s.title}`);
    if (s.intro) out.push(blocksToMd(s.intro));
    if (s.condor) out.push(`### With Condor\n\n${blocksToMd(s.condor)}`);
    if (s.client) out.push(`### With Hummingbot Client\n\n${blocksToMd(s.client)}`);
    if (s.outro) out.push(blocksToMd(s.outro));
  });
  out.push("## Next steps", NEXT_STEPS.map((n) => `- [${n.label}](${n.href.startsWith("/") ? SITE_URL + n.href : n.href}): ${n.body}`).join("\n"));
  return out.join("\n\n") + "\n";
}
