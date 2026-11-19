"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { safeCallbackUrl } from "@/botcamp/lib/app-url"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/botcamp/components/ui/card"
import { VerificationCodeInput } from "./VerificationCodeInput"
import { Loader2, Mail, ArrowLeft } from "lucide-react"

export function PasswordlessSignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"))

  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, callbackUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to send verification code")
        setIsLoading(false)
        return
      }

      setSuccessMessage("Check your email for a verification code")
      setStep("code")
      setIsLoading(false)
    } catch {
      setErrorMessage("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  async function handleVerifyCode(code: string) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || "Invalid verification code")
        setIsLoading(false)
        return
      }

      // Sign in with the single-use login ticket minted by verify-code. The
      // ticket — not the email — is what authenticates the session.
      const result = await signIn("credentials", {
        email,
        ticket: data.loginTicket,
        redirect: false,
      })

      if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setErrorMessage("Sign-in failed. Please request a new code and try again.")
        setIsLoading(false)
      }
    } catch {
      setErrorMessage("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  function handleBackToEmail() {
    setStep("email")
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  if (step === "code") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-bc-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2"
            onClick={handleBackToEmail}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <CardTitle className="text-2xl font-bold">Enter your code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          {errorMessage && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-bc-md">
              {errorMessage}
            </div>
          )}

          <div className="space-y-bc-4">
            <div className="space-y-bc-2">
              <Label className="text-center block">Verification Code</Label>
              <VerificationCodeInput
                onComplete={handleVerifyCode}
                disabled={isLoading}
              />
            </div>

            {isLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </div>
            )}

            <div className="text-center">
              <Button
                variant="link"
                size="sm"
                onClick={handleRequestCode}
                disabled={isLoading}
                type="button"
              >
                Didn&apos;t receive a code? Send again
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Check your spam folder if you don&apos;t see the email
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-bc-1">
        <CardTitle className="text-2xl font-bold">Sign in with email</CardTitle>
        <CardDescription>
          Enter your email to receive a verification code
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleRequestCode}>
        <CardContent className="space-y-bc-4">
          {errorMessage && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-bc-md">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 text-sm text-success bg-success/10 border border-success/20 rounded-bc-md">
              {successMessage}
            </div>
          )}
          <div className="space-y-bc-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending code...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Continue with Email
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            We&apos;ll send you a 6-digit code and a magic link
          </p>
        </CardContent>
      </form>
    </Card>
  )
}
