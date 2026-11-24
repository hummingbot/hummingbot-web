"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/botcamp/components/ui/accordion"
import { Button } from "@/botcamp/components/ui/button"

const VISIBLE_COUNT = 6

export default function CohortFAQ() {
  const [showAll, setShowAll] = useState(false)

  const faqs = [
    {
      question: "What is an algo trading strategy?",
      answer:
        "An algo trading strategy is an automated trading system that makes decisions and executes orders based on pre-defined rules — without manual intervention. In Botcamp, you'll learn to design, build, and deploy strategies (market making, cross-exchange arbitrage, directional, LP) using Hummingbot, and to wrap them in AI agents managed by Condor.",
    },
    {
      question: "What is Hummingbot?",
      answer:
        "Hummingbot is an open-source framework for building algorithmic trading strategies on centralized and decentralized exchanges. It ships with battle-tested strategies for market making, arbitrage, and liquidity provision, plus connectors to 100+ venues — and it's maintained by a global community of contributors.",
    },
    {
      question: "What is Condor?",
      answer:
        "Condor is a Telegram-based operating system for AI trading agents. It provides a mobile-friendly interface to manage trading bots, monitor portfolios across exchanges, and execute advanced trading strategies (Position, Grid, DCA, TWAP, and more). During the cohort, you'll create agents that can run in Condor, OpenClaw, and other agentic harnesses.",
    },
    {
      question: "What's the difference between Botcamp Cohorts and Courses?",
      answer:
        "Botcamp Cohorts are intensive 4-week programs with live instruction, personalized mentorship from Hummingbot core maintainers, hands-on projects, and certification opportunities. Cohort participants gain access to our private Discord community and can publish strategies on this site. Botcamp Courses provide self-paced access to educational content (videos, challenges, and quizzes) but do not include live sessions, mentorship, certification, or membership benefits.",
    },
    {
      question: "Do I need coding experience to take Botcamp?",
      answer:
        "No - students will learn how to create trading agents that are described with Markdown files and other templates. Coding experience is beneficial if you want to build more complex custom strategies, but it's not required to earn certification.",
    },
    {
      question: "How many live sessions are there in a Botcamp cohort?",
      answer:
        "13 live sessions, including Demo Day.",
    },
    {
      question: "When do live sessions take place?",
      answer:
        "Live sessions are held on Zoom at 8am PST / 11am EST / 3pm UTC, a time that enables participants from Europe, Asia, and the Americas to join live.",
    },
    {
      question: "Are live sessions recorded?",
      answer:
        "Yes, all live sessions are recorded, and recordings are made available to all cohort participants within 24 hours after each session.",
    },
    {
      question: "What happens if I can't make a live session?",
      answer:
        "Botcamp live sessions are designed to allow students to attend from anywhere. All sessions are recorded, transcribed, and posted on the Botcamp platform within 24 hours after each session, so you can catch up at your convenience.",
    },
    {
      question: "What's the expected time commitment for a Botcamp cohort?",
      answer:
        "Botcamp is designed to be flexible and accommodate different schedules. The exact time commitment can vary, but on average, students who earn certification have spent 5-10 hours per week on Botcamp during the 4-week cohort.",
    },
    {
      question: "If I get busy, can I defer my enrollment until a future cohort?",
      answer:
        "We understand that things change. You can defer your enrollment to the next cohort for free until after the first week. After the first week, no deferrals are allowed.",
    },
    {
      question: "What's the refund and cancellation policy?",
      answer:
        "You can cancel up to 2 weeks before the cohort starts for a full refund. Afterwards, a 20% cancellation fee will apply. No refunds will be granted for cancellations made after the first live session.",
    },
    {
      question: "Are group membership discounts available?",
      answer:
        "Yes, we offer substantial discounts for teams signing up 3 or more seats for a Botcamp cohort! Please chat with us in Telegram to learn more: https://t.me/botcampcohorts",
    },
    {
      question: "How long do I have access to Botcamp content?",
      answer:
        "You have lifetime access to the Botcamp platform, including all course content, session recordings of live sessions and office hours, and for cohort participants, access to private Discord channels for ongoing support.",
    },
    {
      question: "What have past Botcamp students done afterwards?",
      answer:
        "Past Botcamp graduates have gone on to land trading jobs at crypto market making firms, run market making bots for their own tokens, build consistently profitable trading strategies, partner with other Botcamp members on projects, and become mentors in future Botcamp cohorts.",
    },
    {
      question: "What do I need to do to earn my Hummingbot certification?",
      answer:
        "To earn your Hummingbot certification, you need to complete the requirements of either the Market Maker or the Strategy Developer certification track, and present your own trading strategy during the Demo Day final live session.",
    },
    {
      question: "Can I contribute to the Hummingbot open source codebase?",
      answer:
        "Yes! Botcamp members have created many of the Community Scripts in the official Hummingbot codebase, and students continue to contribute code and earn dev bounties after they earn their certificate.",
    },
    {
      question: "Does buying a cohort seat include access to Botcamp courses?",
      answer:
        "Yes, your Botcamp cohort purchase includes access to 4 introductory courses on algo trading strategies and market making strategies - a $600 value - as well as a private Discord channels for support.",
    },
    {
      question: "Can I pay with crypto?",
      answer:
        "Yes, we accept major stablecoins across a variety of blockchain networks. To arrange a crypto payment for a Botcamp cohort or course, please chat with us in Telegram: https://t.me/botcampcohorts",
    },
  ]

  return (
    <section
      id="common-questions"
      className="w-full py-12 md:py-24 lg:py-32 bg-background"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl text-center mb-8 text-foreground">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full max-w-3xl">
            {(showAll ? faqs : faqs.slice(0, VISIBLE_COUNT)).map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-foreground text-lg md:text-xl hover:no-underline hover:text-secondary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-foreground text-base md:text-lg">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {faqs.length > VISIBLE_COUNT && (
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="mt-6 flex items-center gap-2"
            >
              <span>{showAll ? "Show Less" : "See More Questions"}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
