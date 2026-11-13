import type { Metadata } from "next";
import { Monoton } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const satoshi = localFont({
  // Latin + Latin-1 subset of Satoshi-Variable.ttf (wght axis kept), as woff2.
  src: "../../../../packages/tokens/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});

// Decorative numerics only (cohort numbers, prize amounts) — never body or headings.
const monoton = Monoton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-monoton-face",
  display: "swap",
  // Decorative, on a few sections only: don't preload it on every page.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hummingbot.org"),
  title: "Hummingbot — The open source framework for agentic trading strategies",
  description:
    "Open source, self-hosted trading bots and AI agents across 50+ exchanges.",
};

// Resolve the theme before first paint to avoid a flash: stored choice wins,
// else the OS preference, else the brand's dark default.
const themeScript = `(function(){try{var s=localStorage.getItem('site-theme');var t=s||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${satoshi.variable} ${monoton.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
