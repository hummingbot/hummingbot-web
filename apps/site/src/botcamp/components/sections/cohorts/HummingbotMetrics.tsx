import { Github, Globe } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"

export default function HummingbotMetrics() {
    const metrics = [
      {
        value: "$25 billion",
        description: "Last 12M Reported Trade Volume"
      },
      {
        value: "50+",
        description: "Official CEX and DEX Connectors"
      },
      {
        value: "15K+",
        description: "Active Discord Members"
      }
    ]
  
    return (
      <section className="w-full py-12 md:py-24 bg-muted dark:bg-gradient-primary-fade">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-4xl md:text-5xl font-bold tracking-bc-tighter text-center text-foreground dark:text-white mb-4">
            Powered by Hummingbot
          </h2>
          <p className="text-muted-foreground dark:text-slate-300 text-center max-w-2xl mx-auto mb-12">
          Hummingbot is an open source Python framework that helps you run automated trading strategies on any CEX and DEX
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {metrics.map((metric, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {metric.value}
                </div>
                <p className="text-muted-foreground dark:text-slate-300">
                  {metric.description}
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4">
            <Button variant="default" size="lg" asChild>
              <a
                href="https://hummingbot.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                <Globe className="w-5 h-5 mr-2" /> Website
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/hummingbot/hummingbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                <Github className="w-5 h-5 mr-2" /> Github
              </a>
            </Button>
          </div>
        </div>
      </section>
    )
  }
