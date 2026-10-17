import Link from "next/link";

// Pointed sun badge from the design tokens: the "0" in 404.
const SUN = "50,4 59.8,13.3 73,10.2 76.9,23.1 89.8,27 86.7,40.2 96,50 86.7,59.8 89.8,73 76.9,76.9 73,89.8 59.8,86.7 50,96 40.2,86.7 27,89.8 23.1,76.9 10.2,73 13.3,59.8 4,50 13.3,40.2 10.2,27 23.1,23.1 27,10.2 40.2,13.3";

export default function NotFound() {
  return (
    <main className="wrap">
      <section className="flex min-h-[520px] flex-col items-center justify-center rounded-[32px] bg-sky px-6 py-20 text-center">
        <h1 className="rise mb-8 flex items-center gap-2 text-hero font-semibold sm:gap-4 sm:text-mark" aria-label="404">
          <span aria-hidden>4</span>
          <svg viewBox="-2 -2 104 104" aria-hidden className="size-24 sm:size-32">
            <polygon points={SUN} className="origin-center [transform-box:fill-box] motion-safe:animate-[burst-spin_60s_linear_infinite]" fill="var(--color-sun)" stroke="var(--color-sun)" strokeWidth="8" strokeLinejoin="round" />
            <path d="M41 36 L64 50 L41 64 Z" fill="var(--color-ink)" stroke="var(--color-ink)" strokeWidth="5" strokeLinejoin="round" />
          </svg>
          <span aria-hidden>4</span>
        </h1>
        <h2 className="rise mb-4 text-2xl font-semibold [--d:100ms] sm:text-display">Nothing is playing here.</h2>
        <p className="rise mb-10 max-w-[520px] text-xl leading-normal text-muted [--d:200ms]">
          The link might be broken, or the video or session no longer exists. Paste the link again and start fresh.
        </p>
        <div className="rise flex flex-wrap justify-center gap-3 [--d:300ms]">
          <Link href="/?paste=1#start" className="btn">Paste a new link ↗</Link>
          <Link href="/library" className="btn-outline">Open library</Link>
        </div>
      </section>
    </main>
  );
}
