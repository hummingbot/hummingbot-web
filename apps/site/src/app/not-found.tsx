import Link from "next/link";
import { Button, GradientText } from "@hummingbot/ui";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { urls } from "@/config/site";

export const metadata = { title: "Page not found — Hummingbot" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="font-mono text-sm text-ink-500">404</p>
        <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          This page could not be <GradientText>found</GradientText>
        </h1>
        <p className="mt-3 max-w-md text-pretty text-ink-400">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button size="lg">Back to home</Button>
          </Link>
          <a href={urls.docs} target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline">
              Read the docs
            </Button>
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
