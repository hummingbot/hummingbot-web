import Link from "next/link"

interface LessonAccessDeniedProps {
  requiresAuth: boolean
  returnUrl: string
  returnLabel: string
  contextMessage?: string
}

export function LessonAccessDenied({
  requiresAuth,
  returnUrl,
  returnLabel,
  contextMessage,
}: LessonAccessDeniedProps) {
  if (requiresAuth) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold mb-4">Create an Account to Continue</h1>
          <p className="text-muted-foreground mb-6">
            Sign up for a free account to access this content.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-bc-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md p-8">
        <h1 className="text-2xl font-bold mb-4">Lesson Locked</h1>
        <p className="text-muted-foreground mb-6">
          {contextMessage || "You must be enrolled to access this content."}
        </p>
        <Link
          href={returnUrl}
          className="inline-flex items-center justify-center rounded-bc-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {returnLabel}
        </Link>
      </div>
    </div>
  )
}
