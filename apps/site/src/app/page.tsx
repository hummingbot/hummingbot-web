import { Badge, Button, CodeBlock, GradientText, Section } from "@hummingbot/ui";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Section className="flex flex-col items-center gap-8 pt-24 text-center">
        <Badge variant="brand">Phase 0 · foundation</Badge>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-balance sm:text-6xl">
          The open source framework for{" "}
          <GradientText>agentic trading strategies</GradientText>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground text-pretty">
          Open source, self-hosted trading bots and AI agents across 50+
          exchanges.
        </p>
        <CodeBlock
          command="curl -fsSL https://hummingbot.org/install.sh | bash"
          className="w-full max-w-xl"
        />
        <div className="flex gap-3">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">
            Star on GitHub
          </Button>
        </div>
      </Section>
    </main>
  );
}
