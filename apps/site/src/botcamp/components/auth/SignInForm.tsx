"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { signIn, signOut } from "next-auth/react"
import { safeCallbackUrl } from "@/botcamp/lib/app-url"
import Link from "next/link"
import { Button } from "@/botcamp/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/botcamp/components/ui/card"
import { Loader2, Mail, Github } from "lucide-react"
import { PasswordlessSignInForm } from "./PasswordlessSignInForm"

export function SignInForm() {
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"))

  // Sent here by the signIn callback when Google or GitHub hasn't verified
  // the account's email — accounts are linked by email, so it must be proven.
  const unverifiedEmail = searchParams.get("error") === "email_unverified"
  // Sent here when Google or GitHub was tried while signed in to a different
  // Botcamp account — it would have been linked to that account.
  const signedInAsOther = searchParams.get("error") === "signed_in_as_other"

  const [mode, setMode] = useState<"options" | "passwordless">("options")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isGitHubLoading, setIsGitHubLoading] = useState(false)

  if (mode === "passwordless") {
    return <PasswordlessSignInForm />
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)

    try {
      await signIn("google", {
        callbackUrl,
      })
    } catch {
      setIsGoogleLoading(false)
    }
  }

  async function handleGitHubSignIn() {
    setIsGitHubLoading(true)

    try {
      await signIn("github", {
        callbackUrl,
      })
    } catch {
      setIsGitHubLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-bc-1">
        <CardTitle className="text-2xl font-bold">Sign in to Hummingbot</CardTitle>
        <CardDescription>
          Choose your preferred sign-in method
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {unverifiedEmail && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-bc-md">
            That account&apos;s email isn&apos;t verified. Verify it with Google or GitHub, or sign in with email
            below.
          </div>
        )}

        {signedInAsOther && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-bc-md space-y-bc-2">
            <p>
              You&apos;re signed in to a different account, so that Google or GitHub account wasn&apos;t
              connected to it. Sign out, then try again.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/signin" })}
            >
              Sign out
            </Button>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full h-12"
          disabled={isGoogleLoading || isGitHubLoading}
          onClick={handleGoogleSignIn}
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
          Sign in with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full h-12"
          disabled={isGoogleLoading || isGitHubLoading}
          onClick={handleGitHubSignIn}
        >
          {isGitHubLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Github className="mr-2 h-4 w-4" />
          )}
          Sign in with GitHub
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-12"
          disabled={isGoogleLoading || isGitHubLoading}
          onClick={() => setMode("passwordless")}
        >
          <Mail className="mr-2 h-4 w-4" />
          Sign in with Email Link
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col space-y-bc-4">
        <p className="text-sm text-muted-foreground text-center">
          Don&apos;t have an account?{" "}
          {/* Keeps where they were headed, so signing up lands them there too. */}
          <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
