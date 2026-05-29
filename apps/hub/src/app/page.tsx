import { Badge, GradientText, Section } from "@hummingbot/ui";

export default function HubHome() {
  return (
    <main className="flex flex-1 flex-col">
      <Section className="flex flex-col items-center gap-6 pt-24 text-center">
        <Badge variant="brand">Hub · Phase 0</Badge>
        <h1 className="text-5xl font-bold tracking-tight text-balance">
          <GradientText>Built by the community.</GradientText>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground text-pretty">
          Trading strategies, routines, and agents — installable in one command.
        </p>
      </Section>
    </main>
  );
}
