import { backers } from "@hummingbot/brand";
import { ThemedLogo } from "@/components/ui/themed-logo";

export function UsedBy() {
  return (
    <section className="border-y border-ink-900 bg-ink-999/50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-ink-500">
          Backed &amp; trusted by
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {backers.map((logo) => (
            <li key={logo.name}>
              <ThemedLogo
                dark={logo.dark}
                light={logo.light}
                alt={logo.name}
                className="h-7 w-auto opacity-60 grayscale transition hover:opacity-90 hover:grayscale-0"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
