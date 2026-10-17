import Link from "next/link";
import { notFound } from "next/navigation";
import type { Feedback } from "@/app/api/review/route";
import { getSession } from "@/lib/db";
import { toMarkdown, toPoint } from "@/lib/export";
import { fmtTime } from "@/lib/youtube";
import { ScoreRing, scoreColor, Thumb } from "../../ui";
import CopyButton from "./copy-button";

// Each result type gets its own shape as well as its own color, so they read apart without color.
const SECTIONS = [
  {
    key: "covered", title: "You got right", text: "text-good", rule: "border-good", empty: "Nothing matched yet.",
    icon: <><circle cx="14" cy="14" r="14" className="fill-good" /><path d="M8 14.5l4 4 8-9" fill="none" stroke="var(--color-paper)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></>,
  },
  {
    key: "missed", title: "You missed", text: "text-mid", rule: "border-mid", empty: "You covered everything important.",
    icon: <circle cx="14" cy="14" r="12" fill="none" stroke="var(--color-mid)" strokeWidth="2.5" strokeDasharray="4 3.5" />,
  },
  {
    key: "incorrect", title: "Not quite right", text: "text-bad", rule: "border-bad", empty: "No mistakes. Nice.",
    icon: <><rect x="2" y="2" width="24" height="24" rx="6" className="fill-bad" /><path d="M10 10l8 8M18 10l-8 8" stroke="var(--color-paper)" strokeWidth="2.5" strokeLinecap="round" /></>,
  },
] as const;

function verdict(score: number) {
  return score >= 80 ? "Nailed it" : score >= 50 ? "Mostly there" : "Worth another watch";
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession((await params).id);
  if (!s) notFound();
  const fb = s.feedback as Feedback | { error: string } | null;
  const recapWords = s.recap.trim() ? s.recap.trim().split(/\s+/).length : 0;

  return (
    <main className="wrap flex flex-col pt-4">
      <Link href="/library" className="rise mb-6 w-fit text-sm text-muted transition-colors hover:text-ink">← Library</Link>

      <header className="rise mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between [--d:80ms]">
        <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-end">
          <Thumb videoId={s.video_id} className="w-full sm:w-52" />
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="line-clamp-3 text-2xl font-semibold break-words sm:text-display">{s.title ?? s.video_id}</h1>
            <p className="text-sm text-muted">
              {s.updated_at ? "Updated " : ""}
              {new Date(s.updated_at ?? s.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/watch/${s.video_id}`} className="btn">Rewatch and add notes ↗</Link>
          <a href={`/library/${s.id}/markdown`} download className="btn-outline">Download .md</a>
          <CopyButton text={toMarkdown(s)} />
        </div>
      </header>

      {fb && "error" in fb ? (
        <p className="rounded-panel bg-paper p-6 text-muted">{fb.error}</p>
      ) : fb ? (
        <>
          <section className="rise flex flex-col gap-8 rounded-hero bg-night p-6 text-night-ink sm:flex-row sm:items-center sm:p-10 [--d:160ms]">
            <div className={scoreColor(fb.score, true)}>
              <ScoreRing score={fb.score} size={136} onDark />
            </div>
            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-2.5 text-sm text-night-muted">
                <span aria-hidden className="size-2 rounded-full bg-sun" />
                Feedback · {verdict(fb.score)}
              </span>
              <p className="max-w-3xl text-xl leading-[1.4] sm:text-2xl">{fb.summary}</p>
            </div>
          </section>

          <section className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {SECTIONS.map(({ key, title, text, rule, empty, icon }) => (
              <div key={key} className="reveal flex min-w-0 flex-col">
                <h2 className={`flex items-center gap-3 border-b-2 pb-4 text-xl font-semibold ${rule}`}>
                  <svg width="24" height="24" viewBox="0 0 28 28" aria-hidden className="shrink-0">{icon}</svg>
                  {title}
                  <span className={`ml-auto tabular-nums ${text}`}>{fb[key].length}</span>
                </h2>
                {fb[key].length ? (
                  <ul className="flex flex-col">
                    {fb[key].map(toPoint).map((p, i) => (
                      <li key={i} className="flex flex-col items-start gap-3 border-b border-line py-5 leading-normal break-words">
                        {p.text}
                        {p.t !== null && (
                          <Link href={`/watch/${s.video_id}?t=${Math.floor(p.t)}`} title="Watch this moment" className="pill-time">
                            <span aria-hidden className="text-xs">▶</span> {fmtTime(p.t)}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-5 text-muted">{empty}</p>
                )}
              </div>
            ))}
          </section>
        </>
      ) : null}

      <div className="mt-24 grid gap-12 lg:grid-cols-[2fr_3fr]">
        {!!s.notes?.length && (
          <section className="reveal flex flex-col">
            <h2 className="text-2xl font-semibold">Notes while watching</h2>
            <p className="mb-4 text-sm text-muted">{s.notes.length} {s.notes.length === 1 ? "note" : "notes"}</p>
            <ol className="border-t border-line">
              {s.notes.map((n, i) => (
                <li key={i} className="flex items-start gap-4 border-b border-line py-4">
                  <Link href={`/watch/${s.video_id}?t=${n.t}`} title="Watch this moment" className="pill-time shrink-0">
                    {fmtTime(n.t)}
                  </Link>
                  <p className="min-w-0 leading-normal break-words">{n.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="reveal flex flex-col lg:col-start-2">
          <h2 className="text-2xl font-semibold">Your recap</h2>
          <p className="mb-4 text-sm text-muted">{recapWords} {recapWords === 1 ? "word" : "words"}</p>
          <p className="rounded-panel bg-paper p-6 text-xl leading-[1.6] break-words whitespace-pre-wrap sm:p-8">{s.recap}</p>
        </section>
      </div>
    </main>
  );
}
