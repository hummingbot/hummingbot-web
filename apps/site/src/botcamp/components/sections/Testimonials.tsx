'use client'

import Image from 'next/image'
import Link from 'next/link'
import { HomeMemberProfileCard } from "@/botcamp/components/ui/home-member-profile-card"
import { Button } from "@/botcamp/components/ui/button"
import { ArrowRight } from "lucide-react"
import type { TestimonialMember } from "./testimonial-members"
// Company logos - dark versions (for dark mode)
import binanceLogo from "@/botcamp/images/logos/binance-logo.png"
import amazewallet from "@/botcamp/images/logos/amazewallet.png"
import injective from "@/botcamp/images/logos/Injective.png"
import decryptDark from "@/botcamp/images/logos/decrypt-dark.png"
import harvardDark from "@/botcamp/images/logos/harvard-dark.png"
import appleDark from "@/botcamp/images/logos/apple-dark.png"
import rippleDark from "@/botcamp/images/logos/ripple-dark.png"
import outlierDark from "@/botcamp/images/logos/outlier-dark.png"
// Company logos - light versions (for light mode)
import decryptLight from "@/botcamp/images/logos/decrypt-light.png"
import harvardLight from "@/botcamp/images/logos/harvard-light.png"
import appleLight from "@/botcamp/images/logos/apple-light.png"
import rippleLight from "@/botcamp/images/logos/ripple-light.png"
import outlierLight from "@/botcamp/images/logos/outlier-light.png"

export default function Testimonials({ members = [] }: { members?: TestimonialMember[] }) {
  const loading = false

  const memberProfiles = [
    {
      slug: "wan-hong-lau",
      name: "Alex",
      location: "Singapore",
      bio: "I'm a software engineer, so learning the trader mindset and navigating the DeFi jungle were important to help me grow as an algo trader.",
      storyVideoId: "4elUhsZdc6w",
    },
    {
      slug: "tobias-rethmeyer",
      name: "Toby",
      location: "Germany",
      bio: "Botcamp helped me utilize Hummingbot to its fullest, and I finally grasped the nuances of the cross-exchange market making strategy.",
      storyVideoId: "QPnOPPoXcrM",
    },
    {
      slug: "viktoria-tsybko",
      name: "Vik",
      location: "Russia",
      bio: "Coding was just a hobby, but then I found that I can make money from it. Now, I run Hummingbot to support my family's needs!",
      storyVideoId: "rFq0Add0qJ0",
    },
  ]


  // Logos with light/dark variants (null means same for both)
  const logos = [
    { light: binanceLogo, dark: binanceLogo, alt: 'Binance' },
    { light: appleLight, dark: appleDark, alt: 'Apple' },
    { light: rippleLight, dark: rippleDark, alt: 'Ripple' },
    { light: harvardLight, dark: harvardDark, alt: 'Harvard University' },
    { light: decryptLight, dark: decryptDark, alt: 'Decrypt' },
    { light: outlierLight, dark: outlierDark, alt: 'Outlier Ventures' },
    // White-only artwork: no light-background file exists, so it's darkened in light mode.
    { light: injective, dark: injective, alt: 'Injective', whiteOnly: true },
    { light: amazewallet, dark: amazewallet, alt: 'Amaze Wallet', whiteOnly: true },
  ]

  return (
    <section className="w-full py-16 md:py-24 border-y border-border">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="flex flex-col items-center">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
              Our Community
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-bc-tight mb-4 text-foreground">
              Traders and engineers from top institutions.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">
              Our members come from leading companies, universities, and
              trading firms around the world.
            </p>
          </div>

          {/* Logo grid - uses CSS to switch between light/dark versions */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 mb-16">
            {logos.map((logo, index) => (
              <div key={index} className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                {/* Light mode logo */}
                <Image
                  src={logo.light}
                  alt={logo.alt}
                  width={100}
                  height={50}
                  className={`dark:hidden ${'whiteOnly' in logo && logo.whiteOnly ? 'brightness-0' : ''}`}
                />
                {/* Dark mode logo */}
                <Image
                  src={logo.dark}
                  alt={logo.alt}
                  width={100}
                  height={50}
                  className="hidden dark:block"
                />
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3 w-full">
            {loading ? (
              // Loading skeleton
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-card/50 rounded-bc-lg border border-border p-6 animate-pulse">
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-muted mb-4"></div>
                    <div className="h-6 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-24 mb-4"></div>
                    <div className="h-20 bg-muted rounded w-full"></div>
                  </div>
                </div>
              ))
            ) : (
              memberProfiles.map((profile) => {
                const member = members.find(m => m.slug === profile.slug)
                return (
                  <HomeMemberProfileCard
                    key={profile.slug}
                    name={profile.name}
                    location={profile.location}
                    bio={profile.bio}
                    avatarURL={member?.avatarURL || null}
                    slug={profile.slug}
                    storyVideoId={profile.storyVideoId}
                  />
                )
              })
            )}
          </div>

          {/* Updated button to view all members */}
          <div className="mt-12">
            <Button variant="default" size="lg" asChild>
              <Link href="/builders">
                All Builders
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
