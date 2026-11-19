import { Suspense } from "react"
import { SignUpForm } from "@/botcamp/components/auth/SignUpForm"

export const metadata = {
  title: "Sign Up — Hummingbot",
  description: "Create your Hummingbot account",
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpForm />
    </Suspense>
  )
}
