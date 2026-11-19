"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/botcamp/components/ui/accordion"
import {
  ELIGIBLE_EXCHANGES,
  SCORING_CRITERIA,
  SQUAD_RULES,
} from "@/botcamp/lib/hackathon-squads"
import { CODE_FREEZE, FINALS_CODE_FREEZE_HOURS, fmtFull } from "@/botcamp/lib/hackathon-stages"

/** The serializable slice of a StagePhase — no icon crosses the client boundary. */
interface RulePhase {
  label: string
  date: string | null
  desc: string
}

interface HackathonRulesProps {
  hackathonTitle: string
  /** Competition stages with their date ranges — the schedule of record. */
  phases: RulePhase[]
  /** Date winners are announced, pre-formatted. */
  winnersAnnounced: string
  /** Code freeze for agents holding a finals seat, pre-formatted. */
  /** Null until the race date is set. */
  finalsCodeFreeze: string | null
  /** Date team applications close, pre-formatted. */
  applicationsClose: string | null
  rankedDriverCount: number
  /** Agent seats per team — this hackathon's `maxSelections`. */
  slotsPerSquad: number
}

function Article({
  value,
  number,
  title,
  children,
}: {
  value: string
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <AccordionItem value={value} className="border-border">
      <AccordionTrigger className="gap-4 text-left hover:no-underline">
        <span className="flex items-baseline gap-3">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {String(number).padStart(2, "0")}
          </span>
          <span className="text-base font-semibold">{title}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-bc-3 pb-5 pl-0 sm:pl-9 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </AccordionContent>
    </AccordionItem>
  )
}

/** Bulleted list sharing the article body's muted type scale. */
function RuleList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-bc-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The official rules of the competition, written as numbered articles rather
 * than marketing copy — this is the page builders are pointed at when they ask
 * "is that allowed?". Collapsed by default so the section stays scannable.
 */
export function HackathonRules({
  hackathonTitle,
  phases,
  winnersAnnounced,
  finalsCodeFreeze,
  applicationsClose,
  rankedDriverCount,
  slotsPerSquad,
}: HackathonRulesProps) {
  return (
    <Accordion type="multiple" className="rounded-bc-lg border border-border px-4 sm:px-5">
      <Article value="eligibility" number={1} title="Eligibility">
        <p>
          The {hackathonTitle} is open to anyone with a free Botcamp account. There is no entry
          fee, and no prior trading or professional coding experience is required.
        </p>
        <p>
          To be eligible to race, an entrant must register for the competition, build a qualifying
          agent or controller, and submit an application to at least one team before applications close
          {applicationsClose ? ` on ${applicationsClose}` : ""}. An entrant may submit more than one
          agent or controller, each as a separate application.
        </p>
      </Article>

      <Article value="format" number={2} title="Competition Format">
        <p>
          The competition runs in {phases.length} stages. Dates below are the schedule of record;
          entrants are responsible for meeting each deadline. The build and selection stages overlap
          — teams begin claiming seats while submissions are still open.
        </p>
        <RuleList
          items={phases.map((phase) => (
            <>
              <strong>
                {phase.label}
                {phase.date ? ` (${phase.date})` : ""}
              </strong>{" "}
              — {phase.desc}
            </>
          ))}
        />
        <p>Winners are announced on {winnersAnnounced}.</p>
      </Article>

      <Article value="teams" number={3} title="Teams and Race Seats">
        <p>
          A <strong>team</strong> is a constructor in this competition — an exchange or protocol
          sponsor that fields entries under its own flag. Botcamp competes as the host team.
        </p>
        <p>
          Each sponsoring team fields {slotsPerSquad} entries, each an agent or controller. As in
          Formula 1&apos;s Constructors&apos; Championship, every entry is ranked individually while
          the {hackathonTitle} itself is awarded to the team with the strongest combined result from
          its {slotsPerSquad} seats.
        </p>
        <p>
          Each team sets its own selection criteria and chooses which builders fill its seats.
          Botcamp does not assign seats on a team&apos;s behalf.
        </p>
      </Article>

      <Article value="applications" number={4} title="Applications and Selection">
        <p>
          Entrants apply for a seat by submitting an agent or controller to one or more teams and
          ranking their team preferences in order. Every team an entrant ranks may review the
          submission.
        </p>
        <p>
          Because each team defines its own criteria, entrants are advised to rank the teams whose
          venues and mandates best fit their strategy. Teams review applications and claim their
          seats on a rolling basis while the submission window is still open, so entrants are
          advised to apply early. Seat assignments are final once published.
        </p>
      </Article>

      <Article value="agents" number={5} title="Agent and Controller Requirements">
        <p>
          A qualifying entry must be a runnable agentic trading strategy in one of two forms:
        </p>
        <RuleList
          items={[
            <>
              <strong>Hummingbot V2 Controller</strong> — a Python controller class plus YAML
              configuration that runs natively inside Hummingbot.
            </>,
            <>
              <strong>Condor Agent</strong> — an autonomous LLM-driven agent that orchestrates
              Hummingbot through Condor.
            </>,
          ]}
        />
        <p>Both forms race on equal footing. Every submission must include:</p>
        <RuleList
          items={[
            "The complete strategy code required to run the agent or controller.",
            <>
              A <strong>strategy.md</strong> file describing the strategy, its parameters, and its
              intended market conditions.
            </>,
            "A demo video showing the agent or controller running.",
          ]}
        />
        <p>
          Every agent or controller must run unattended for the full duration of the finals. Manual
          trading, external signals entered by hand, and hands-on intervention during the race are
          prohibited.
        </p>
      </Article>

      <Article value="venues" number={6} title="Eligible Trading Venues">
        <p>
          During the finals, agents and controllers may trade on any combination of the following
          venues. Trading on any venue not listed here is not scored and may result in
          disqualification.
        </p>
        <RuleList items={ELIGIBLE_EXCHANGES.map((exchange) => <strong key={exchange}>{exchange}</strong>)} />
      </Article>

      <Article value="capital" number={7} title="Starting Capital and Execution">
        <p>
          Botcamp runs every qualifying agent or controller in a{" "}
          <strong>dedicated Docker instance</strong> funded with <strong>{SQUAD_RULES.startingCapitalAmount} USDC</strong> of
          starting capital. Entrants do not deposit or risk their own funds, and do not custody the
          trading account during the race.
        </p>
        <p>
          The finals run for <strong>48 hours</strong>. At the close of the race, each builder keeps
          the ending balance of their account, whether it is above or below the {SQUAD_RULES.startingCapitalAmount} it started
          with.
        </p>
      </Article>

      <Article value="scoring" number={8} title="Scoring and Ranking">
        <p>Each agent or controller receives a weighted score across three metrics:</p>
        <RuleList
          items={SCORING_CRITERIA.map((criterion) => (
            <>
              <strong>
                {criterion.label} — {criterion.weight}%
              </strong>
            </>
          ))}
        />
        <p>
          Agents and controllers are ranked individually from 1 through {rankedDriverCount}. A
          team&apos;s standing is the sum of its {slotsPerSquad} entries&apos; scores, and the team
          with the highest combined score wins the {hackathonTitle}.
        </p>
        <p>Scores are calculated by Botcamp and published on the live leaderboard during the finals.</p>
      </Article>

      <Article value="freeze" number={9} title="Code Freeze">
        <p>
          Code freezes on <strong>{fmtFull(CODE_FREEZE)}</strong>, when submissions close. From that
          point, the code and <strong>strategy.md</strong> file of every submitted agent or controller
          that does not hold a finals seat are <strong>locked</strong>.
        </p>
        <p>
          Agents holding a finals seat, whether selected by a team or placed by Botcamp, stay
          editable until{" "}
          {finalsCodeFreeze ? <strong>{finalsCodeFreeze}, 00:00 UTC</strong> : "code freeze"},{" "}
          {FINALS_CODE_FREEZE_HOURS} hours before
          the finals begin. From then on they are locked too, and no edits to strategy logic,
          parameters, or configuration are permitted for the remainder of the competition.
        </p>
        <p>
          There is no earlier freeze. Any entrant may revise a submitted agent before code freeze,
          including after a team has selected it.
        </p>
      </Article>

      <Article value="open-source" number={10} title="Open Source and Publication">
        <p>
          All submitted agent and controller code is <strong>public</strong>, in keeping with the open-source
          nature of the Hummingbot framework. By entering, participants agree to have their strategy
          code, description, and demo video published by Botcamp.
        </p>
      </Article>

      <Article value="prizes" number={11} title="Prizes">
        <p>
          The total prize pool is <strong>$20,000</strong>, split between agent capital and
          competition prizes:
        </p>
        <RuleList
          items={[
            <>
              <strong>Agent capital — $11,200.</strong> Every racer keeps the ending account
              balance of their agent or controller ({SQUAD_RULES.startingCapitalAmount} per agent in starting capital), which may
              be higher or lower than the {SQUAD_RULES.startingCapitalAmount} it started with.
            </>,
            <>
              <strong>Competition winners — $8,500.</strong> 1st place: <strong>$5,000</strong> ·
              2nd place: <strong>$2,500</strong> · 3rd place: <strong>$1,000</strong>.
            </>,
            <>
              <strong>Honorable mentions — $300.</strong> $100 each, decided by Botcamp.
            </>,
          ]}
        />
        <p>Prizes are awarded after results are finalized and announced on {winnersAnnounced}.</p>
      </Article>
    </Accordion>
  )
}
