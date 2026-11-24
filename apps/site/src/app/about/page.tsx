import { permanentRedirect } from "next/navigation";

/** The Foundation's pages moved to /foundation (as on hummingbot.org's About). */
export default function AboutPage() {
  permanentRedirect("/foundation");
}
