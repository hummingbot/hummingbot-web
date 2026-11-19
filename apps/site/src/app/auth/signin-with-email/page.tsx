"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { safeCallbackUrl } from "@/botcamp/lib/app-url"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Loader2 } from "lucide-react"

// The magic-link callback lands here with a single-use login ticket. It used
// to sign in on page load, so a link built from the attacker's own magic link
// silently signed a victim into the attacker's account (login CSRF) — after
// which "Sign in with Google" would have tied the victim's Google to it. The
// person now sees which account the link is for and chooses to continue.
function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const email = searchParams.get("email")
  const ticket = searchParams.get("ticket")
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"))
  const missing = !email ? "Missing email parameter" : !ticket ? "Missing login ticket" : null

  async function continueSignIn() {
    if (!email || !ticket) return
    setIsSigningIn(true)
    try {
      const result = await signIn("credentials", {
        email,
        ticket,
        redirect: false,
      })

      if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result?.error || "Failed to sign in")
        setIsSigningIn(false)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setIsSigningIn(false)
      console.error("Sign in error:", err)
    }
  }

  if (error || missing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Sign In Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error || missing}</p>
            <p className="text-sm text-muted-foreground mt-4">
              <a href="/signin" className="text-primary hover:underline">
                Return to sign in
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Continue to Hummingbot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-bc-4">
          <p className="text-sm text-muted-foreground">
            This link signs you in as <span className="font-medium text-foreground break-all">{email}</span>.
          </p>
          <Button className="w-full" onClick={continueSignIn} disabled={isSigningIn}>
            {isSigningIn && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue as {email}
          </Button>
          <p className="text-sm text-muted-foreground">
            Not your email?{" "}
            <a href="/signin" className="text-primary hover:underline">
              Don&apos;t continue — sign in with your own
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInWithEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
