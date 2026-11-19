"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/botcamp/components/ui/button"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { Label } from "@/botcamp/components/ui/label"
import { Checkbox } from "@/botcamp/components/ui/checkbox"
import { LocationInput } from "@/botcamp/components/ui/location-input"
import { SponsorSelect, type SponsorOption } from "@/botcamp/components/hackathons/SponsorSelect"
import { TermsDialog } from "@/botcamp/components/hackathons/TermsDialog"
import { ArrowRight, Loader2 } from "lucide-react"

interface RegistrationFormProps {
  hackathonSlug: string
  teams: SponsorOption[]
}

export function RegistrationForm({ hackathonSlug, teams }: RegistrationFormProps) {
  const router = useRouter()
  const [agentDescription, setAgentDescription] = useState("")
  const [location, setLocation] = useState("")
  const [sponsorTeamId, setSponsorTeamId] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [termsDialogOpen, setTermsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!agreedToTerms) {
      setError("Please agree to the terms and conditions to register.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/hackathons/${hackathonSlug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentDescription: agentDescription.trim() || undefined,
          location: location.trim() || undefined,
          sponsorTeamId: sponsorTeamId ?? undefined,
          agreedToTerms,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to register")
      }

      // Refresh to show success state
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-bc-6">
      <div className="space-y-bc-3">
        <Label htmlFor="agentDescription" className="text-base font-semibold">
          Describe the trading agent you want to build{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          What type of strategy will your agent use? What markets or exchanges will it trade on?
          What makes your approach unique?
        </p>
        <Textarea
          id="agentDescription"
          value={agentDescription}
          onChange={(e) => setAgentDescription(e.target.value)}
          placeholder="I want to build a market-making agent that provides liquidity on Hyperliquid perpetuals. My strategy will use dynamic spread adjustment based on volatility and inventory levels..."
          rows={6}
          className="resize-none"
        />
      </div>

      {teams.length > 0 && (
        <div className="space-y-bc-2">
          <Label className="text-base font-semibold">
            Which sponsor do you want to race for?{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Pick a sponsor to show on your builder card. You can change it later.
          </p>
          <SponsorSelect teams={teams} value={sponsorTeamId} onChange={setSponsorTeamId} />
        </div>
      )}

      <div className="space-y-bc-2">
        <Label htmlFor="location" className="text-base font-semibold">
          Where are you based? <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <LocationInput id="location" value={location} onChange={setLocation} />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="agreedToTerms"
          checked={agreedToTerms}
          onCheckedChange={(checked) => {
            if (checked === true) {
              setTermsDialogOpen(true)
            } else {
              setAgreedToTerms(false)
            }
          }}
          className="mt-0.5"
        />
        <Label htmlFor="agreedToTerms" className="text-sm font-normal leading-snug">
          I agree to the{" "}
          <button
            type="button"
            onClick={() => setTermsDialogOpen(true)}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms of Service
          </button>
          , including the license to my hackathon submissions
        </Label>
      </div>

      <TermsDialog
        open={termsDialogOpen}
        onOpenChange={setTermsDialogOpen}
        onAgree={() => setAgreedToTerms(true)}
      />

      {error && (
        <div className="p-3 rounded-bc-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-bc-3">
        <p className="text-xs text-muted-foreground">
          By registering, your profile will be made public so teams can learn more about you.
        </p>
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting || !agreedToTerms}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              Register
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
