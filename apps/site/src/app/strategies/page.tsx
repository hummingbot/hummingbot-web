import { redirect } from "next/navigation"

// Botcamp's library lives at /strategies; on this site it's the Hub.
export default function StrategiesRedirect(): never {
  redirect("/hub")
}
