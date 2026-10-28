"use client";

import Link from "next/link";

// Shown when a page fails to load (e.g. the database or YouTube is unreachable). Styled like the 404 page.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="wrap">
      <section className="flex min-h-[520px] flex-col items-center justify-center rounded-[32px] bg-sun-soft px-6 py-20 text-center">
        <h1 className="rise mb-4 text-2xl font-semibold sm:text-display">Something went wrong on our side.</h1>
        <p className="rise mb-10 max-w-[520px] text-xl leading-normal text-muted [--d:100ms]">
          Your notes and recaps are safe. Try again, and if it keeps happening, tell us with the Feedback button.
        </p>
        <div className="rise flex flex-wrap justify-center gap-3 [--d:200ms]">
          <button onClick={retry} className="btn">Try again</button>
          <Link href="/" className="btn-outline">Go home</Link>
        </div>
      </section>
    </main>
  );
}
