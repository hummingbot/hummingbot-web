import { backers } from "@hummingbot/brand";

export function UsedBy() {
  return (
    <section className="border-y border-ink-900 bg-ink-999/50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-ink-600">
          Backed &amp; trusted by
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {backers.map((logo) => (
            <li key={logo.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/brand/logos/${logo.dark}`}
                alt={logo.name}
                height={28}
                className="h-7 w-auto opacity-50 grayscale transition hover:opacity-90 hover:grayscale-0"
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
