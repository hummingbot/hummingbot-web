import { Badge } from "@/botcamp/components/ui/badge"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { Bot, CheckCircle, Coins, Sparkles, Target, Trophy } from "lucide-react"

const CURRICULUM_FEATURES = [
  {
    icon: Coins,
    title: "Redesigned Curriculum on Agents and Trading",
    description:
      "The second half of the cohort now focuses on agentic trading strategies, AI infrastructure setup, and more. Learn how to incorporate AI efficiently, reliably, and scalably into your trading workflow to build self-improving agentic strategies.",
    isNew: true,
  },
  {
    icon: Bot,
    title: "AI-Powered Strategy Design with Condor",
    description:
      "Use natural language to define your trading logic with Condor. Describe your strategy in plain English and let AI transform it into a fully functional trading agent that executes on real exchanges.",
    isNew: true,
  },
  {
    icon: Trophy,
    title: "Condor Agents Hackathon",
    description:
      "Top strategies win USDC prizes and represent Botcamp in agent competitions.",
    isNew: true,
  },
]

const MISSION_BULLETS = [
  "Learn professional trading strategies from industry experts",
  "Advice setting up your Hummingbot + Condor + AI infrastructure",
  "Design your own custom strategy across any Hummingbot CEX or DEX",
  "Deploy your strategy as a trading agent or deterministic bot using Condor",
  "Present your strategy on Demo Day",
]

/**
 * Mission + new AI-based features two-column band. Lifted out of the
 * cohort-13 landing page so the same content can run on the top-level
 * /cohorts route.
 */
export function BotcampMission() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <Badge
              variant="outline"
              className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
            >
              <Target className="h-3 w-3 mr-1" />
              Hands-On Learning
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              Your Mission: Build Your Own Custom Algo Trading Strategy
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Design, build, and run your own AI agent-powered algorithmic
              trading strategy using real exchanges and data.
            </p>
            <ul className="space-y-bc-4">
              {MISSION_BULLETS.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-foreground/80"
                >
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-bc-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6 text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              New AI-Based Features in Cohort 13
            </h3>
            {CURRICULUM_FEATURES.map((feature, index) => (
              <Card
                key={index}
                className="bg-card border border-border hover:border-primary/50 transition-all duration-300 shadow-xs"
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="p-2 rounded-bc-lg bg-primary/10 flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">
                        {feature.title}
                      </h4>
                      {feature.isNew && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30"
                        >
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
