"use client"

import Image from "next/image"
import cohortImage from "@/botcamp/images/live-session.webp"

const FEATURES = [
  {
    title: "12+ Theory & Practice Sessions",
    description:
      "Deep dives into market theory, technical implementation and deployment with expert instructors.",
  },
  {
    title: "Hands-On Coaching",
    description:
      "Get personalized help during office hours to troubleshoot your code and optimize your strategy.",
  },
  {
    title: "Get Certified",
    description:
      "Present your strategy on Demo Day and earn official recognition as a certified Hummingbot trader.",
  },
]

export function DarkArtsSection() {
  return (
    <section className="w-full py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="text-center mb-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground mb-3">
            What to expect
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-bc-tight text-foreground mb-4">
            Learn the <span className="text-primary">Dark Arts</span> of Market Making
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            From zero to professional market maker in just 4 intense weeks.
          </p>
        </div>

        {/* Live session reference image */}
        <div className="relative w-full h-[260px] sm:h-[340px] md:h-[460px] rounded-2xl overflow-hidden border border-border shadow-xl">
          <Image
            src={cohortImage}
            alt="A live Botcamp cohort session — chart walk-through alongside the live zoom call."
            fill
            sizes="(min-width: 1280px) 80rem, 100vw"
            className="object-cover"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-bc-xl border border-border p-6">
              <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
