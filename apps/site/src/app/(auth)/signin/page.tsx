import { Suspense } from "react"
import { SignInForm } from "@/botcamp/components/auth/SignInForm"

export const metadata = {
  title: "Sign In — Hummingbot",
  description: "Sign in to your Hummingbot account",
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}
