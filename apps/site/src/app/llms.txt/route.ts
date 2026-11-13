import { AI_INSTRUCTIONS, GUIDE, SITE_URL } from "@/lib/get-started";

export const dynamic = "force-static";

const link = (label: string, path: string, note: string) => `- [${label}](${SITE_URL}${path}): ${note}`;

/**
 * /llms.txt (llmstxt.org): what Hummingbot is and where an AI assistant should
 * look to help someone install and use it. Starts with the get-started guide.
 */
export function GET() {
  const body = [
    "# Hummingbot",
    `> ${GUIDE.summary}`,
    "To help someone install and run Hummingbot, read the get-started guide first: it covers requirements, install, connecting an exchange, a first bot, updating, uninstalling and troubleshooting, for both Condor and the Hummingbot Client.",
    "## Instructions for AI assistants",
    AI_INSTRUCTIONS.map((t) => `- ${t}`).join("\n"),
    "## Get started",
    [
      link("Get started with Hummingbot (Markdown)", "/get-started.md", "the full install-to-first-bot guide, every option and OS"),
      link("Get started (web page)", "/get-started", "the same guide as a page"),
    ].join("\n"),
    "## Docs",
    [
      link("Docs home", "/docs", "all documentation"),
      link("Hummingbot Client", "/docs/client", "the terminal client: commands, configuration, connecting exchanges"),
      link("Strategies", "/docs/strategies", "V2 strategies, controllers, scripts and executors"),
      link("Hummingbot API", "/docs/hummingbot-api", "the server for managing many bots; what Condor runs on"),
      link("Gateway", "/docs/gateway", "trading on decentralized exchanges (DEXs)"),
      link("Exchanges", "/exchanges", "supported exchanges and how to create API keys for each"),
      link("Troubleshooting", "/docs/troubleshooting", "common errors and fixes"),
      link("FAQ", "/docs/faq", "frequently asked questions"),
    ].join("\n"),
    "## Optional",
    [
      link("Strategy Hub", "/hub", "ready-made strategies and agents to clone into Condor"),
      link("Botcamp", "/botcamp", "courses and live cohorts"),
      `- [Condor docs](https://condor.hummingbot.org/llms.txt): in-depth Condor documentation`,
      `- [Source code](https://github.com/hummingbot/hummingbot): Hummingbot on GitHub`,
    ].join("\n"),
  ].join("\n\n");
  return new Response(body + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
