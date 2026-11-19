import { redirect } from "next/navigation"
import { auth } from "@/botcamp/lib/auth"
import { GenerateConnectCodeCard } from "@/botcamp/components/condor/GenerateConnectCodeCard"

export const metadata = {
  title: "Connect Condor - Botcamp",
}

// Where people connect Condor: sign in, and the page shows a code to paste
// into Condor (src/lib/connect-code.ts). Nothing is read from the URL — a
// code someone else filled in is how phishing works.
export default async function ConnectPage(): Promise<React.JSX.Element> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent("/connect")}`)
  }

  return <GenerateConnectCodeCard signedInAs={session.user.email ?? session.user.name ?? ""} />
}
