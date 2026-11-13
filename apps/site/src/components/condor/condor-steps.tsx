// Plain module (no "use client") so server pages can read it.

/** What happens after the command, per Condor's README ("After installation"). */
export const AFTER_INSTALL: { title: string; body: React.ReactNode }[] = [
  {
    title: "Answer the setup questions",
    body: (
      <>
        Pick <strong className="text-foreground">Telegram</strong> (a bot you control from your phone, recommended: have a
        bot token from @BotFather and your Telegram user id ready) or <strong className="text-foreground">Local</strong> (no
        bot, the dashboard opens at <code className="font-mono text-xs">localhost:8088</code>).
      </>
    ),
  },
  {
    title: "Wait for “Condor is online and ready.”",
    body: <>Your bot sends it in Telegram once Condor starts. Send /web to get a link to the dashboard.</>,
  },
  {
    title: "Pull an agent from the Hub",
    body: (
      <>
        In the dashboard, open <strong className="text-foreground">Hub → Pull agents</strong>{" "}
        and look up the agent&apos;s slug. Nothing runs until you switch it on.
      </>
    ),
  },
];
