import { Github, MessageCircle, Twitter, Youtube } from "lucide-react";
import { urls } from "@/config/site";
import { Logo } from "./logo";

const socials = [
  { label: "X", href: urls.x, Icon: Twitter },
  { label: "Discord", href: urls.discord, Icon: MessageCircle },
  { label: "YouTube", href: urls.youtube, Icon: Youtube },
  { label: "GitHub", href: urls.github, Icon: Github },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-800 bg-ink-999">
      {/* Streamlined single-row footer: brand block + tagline on the left,
          socials on the right, with the copyright line folded in below.
          Stacks on mobile, splits left/right on desktop. */}
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-md flex-col gap-4">
          <Logo />
          <p className="text-sm text-ink-500 text-pretty">
            The open source framework for agentic trading strategies. Built by
            market makers worldwide.
          </p>
          <p className="text-xs text-ink-600">
            © {new Date().getFullYear()} Hummingbot Foundation. Apache 2.0.
          </p>
        </div>

        <div className="flex gap-1">
          {socials.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="inline-flex size-10 items-center justify-center rounded-md text-ink-400 hover:bg-ink-900 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-5" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
