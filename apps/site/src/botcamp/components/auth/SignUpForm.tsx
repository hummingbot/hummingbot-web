"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { safeCallbackUrl } from "@/botcamp/lib/app-url"
import Link from "next/link"
import { Button } from "@/botcamp/components/ui/button"
import { Input } from "@/botcamp/components/ui/input"
import { Label } from "@/botcamp/components/ui/label"
import { Checkbox } from "@/botcamp/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/botcamp/components/ui/card"
import { Loader2, Github, Mail, CheckCircle } from "lucide-react"

export function SignUpForm() {
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"))

  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isGitHubLoading, setIsGitHubLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  // Sent here by the signIn callback when an OAuth flow would have created an
  // account without agreement — e.g. the OAuth buttons on /signin, which have
  // no checkbox of their own.
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams.get("error") === "terms_required"
      ? "Agree to the Terms of Service to create an account."
      : null
  )
  const [emailSent, setEmailSent] = useState(false)

  // Form fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [newsletter, setNewsletter] = useState(true)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Carry the newsletter/terms choices through the OAuth redirect via
  // short-lived first-party cookies; the NextAuth jwt callback reads them on
  // account creation.
  function persistSignupChoices() {
    document.cookie = `nl_optin=${newsletter ? "1" : "0"}; path=/; max-age=600; SameSite=Lax`
    document.cookie = `tos_agreed=${agreedToTerms ? "1" : "0"}; path=/; max-age=600; SameSite=Lax`
  }

  async function handleGoogleSignUp() {
    setIsGoogleLoading(true)
    setErrorMessage(null)
    persistSignupChoices()

    try {
      await signIn("google", {
        callbackUrl,
      })
    } catch {
      setErrorMessage("Failed to sign up with Google")
      setIsGoogleLoading(false)
    }
  }

  async function handleGitHubSignUp() {
    setIsGitHubLoading(true)
    setErrorMessage(null)
    persistSignupChoices()

    try {
      await signIn("github", {
        callbackUrl,
      })
    } catch {
      setErrorMessage("Failed to sign up with GitHub")
      setIsGitHubLoading(false)
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    setIsEmailLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, newsletter, agreedToTerms, callbackUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign up")
      }

      setEmailSent(true)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to sign up")
    } finally {
      setIsEmailLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-bc-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          <p className="text-sm text-muted-foreground text-center">
            Click the link in the email to complete your account setup. The link will expire in 10 minutes.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEmailSent(false)
              setEmail("")
              setFirstName("")
              setLastName("")
            }}
          >
            Use a different email
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-md space-y-bc-4">
    <Card className="w-full">
      <CardHeader className="space-y-bc-1">
        <CardTitle className="text-2xl font-bold">Join Hummingbot</CardTitle>
        <CardDescription>
          Create an account to publish your strategies, access free courses, and
          view other builders&apos; strategy code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {errorMessage && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-bc-md">
            {errorMessage}
          </div>
        )}

        {/* Agreeing is what enables every sign-up button below, so it has to
            come first — a gate placed after the controls it unlocks reads as
            a broken page. */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="agreedToTerms"
            checked={agreedToTerms}
            onCheckedChange={(v) => setAgreedToTerms(v === true)}
            disabled={isEmailLoading || isGoogleLoading || isGitHubLoading}
            className="mt-0.5"
          />
          <Label
            htmlFor="agreedToTerms"
            className="text-sm font-normal leading-snug text-muted-foreground"
          >
            By signing up, you agree to the{" "}
            <Link href="/terms" target="_blank" className="text-foreground underline underline-offset-2 hover:text-primary">
              Terms of Service
            </Link>
            .
          </Label>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-12"
          disabled={isGoogleLoading || isGitHubLoading || !agreedToTerms}
          onClick={handleGoogleSignUp}
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Sign up with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full h-12"
          disabled={isGoogleLoading || isGitHubLoading || !agreedToTerms}
          onClick={handleGitHubSignUp}
        >
          {isGitHubLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Github className="mr-2 h-4 w-4" />
          )}
          Sign up with GitHub
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or sign up with email
            </span>
          </div>
        </div>

        <form onSubmit={handleEmailSignUp} className="space-y-bc-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-bc-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isEmailLoading || isGoogleLoading || isGitHubLoading}
              />
            </div>
            <div className="space-y-bc-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={isEmailLoading || isGoogleLoading || isGitHubLoading}
              />
            </div>
          </div>
          <div className="space-y-bc-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isEmailLoading || isGoogleLoading || isGitHubLoading}
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12"
            disabled={isEmailLoading || isGoogleLoading || isGitHubLoading || !agreedToTerms}
          >
            {isEmailLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Sign up with email
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link href="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>

    <div className="flex items-start justify-center gap-2 px-2">
      <Checkbox
        id="newsletter"
        checked={newsletter}
        onCheckedChange={(v) => setNewsletter(v === true)}
        disabled={isEmailLoading || isGoogleLoading || isGitHubLoading}
        className="mt-0.5"
      />
      <Label
        htmlFor="newsletter"
        className="text-sm font-normal leading-snug text-muted-foreground"
      >
        Subscribe to the Hummingbot newsletter for release notes and podcast
        recaps.
      </Label>
    </div>
    </div>
  )
}
