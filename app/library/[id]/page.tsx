import Link from "next/link";
import { notFound } from "next/navigation";
import type { Feedback } from "@/app/api/review/route";
import { getSession } from "@/lib/db";
import { toMarkdown, toPoint } from "@/lib/export";
import { fmtTime } from "@/lib/youtube";
import { Label, ScoreRing, scoreColor, Thumb } from "../../ui";
import CopyButton from "./copy-button";

const SECTIONS = [
  { key: "covered", title: "You got right", dot: "bg-good", empty: "Nothing matched yet." },
  { key: "missed", title: "You missed", dot: "bg-mid", empty: "You covered everything important." },
  { key: "incorrect", title: "Not quite right", dot: "bg-bad", empty: "No mistakes. Nice." },
] as const;

function JumpLink({ videoId, t }: { videoId: string; t: number }) {
  return (
    <Link
      href={`/watch/${videoId}?t=${Math.floor(t)}`}
      title="Watch this moment"
      className="ml-1 inline-block rounded-full bg-canvas px-2 text-xs whitespace-nowrap tabular-nums transition-colors hover:bg-ink hover:text-paper"
    >
      ▶ {fmtTime(t)}
    </Link>
  );
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession((await params).id);
  if (!s) notFound();
  const fb = s.feedback as Feedback | { error: string } | null;

  return (
    <main className="flex flex-col gap-3">
      <header className="grid gap-6 px-2 pt-6 pb-7 lg:grid-cols-[1fr_3fr]">
        <Link href="/library" className="h-fit text-sm transition-colors hover:text-muted">← Library</Link>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <Thumb videoId={s.video_id} className="w-full sm:w-64" />
          <div className="flex min-w-0 flex-col gap-3">
            <h1 className="text-2xl font-medium line-clamp-3 sm:text-display">{s.title ?? s.video_id}</h1>
            <p className="text-sm text-muted">
              {s.updated_at ? "Updated " : ""}
              {new Date(s.updated_at ?? s.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <Link href={`/watch/${s.video_id}`} className="mr-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-85">
                Rewatch and add notes ↗
              </Link>
              <a href={`/library/${s.id}/markdown`} download className="rounded-full px-4 py-3 text-sm transition-colors hover:bg-panel">
                Download .md
              </a>
              <CopyButton text={toMarkdown(s)} />
            </div>
          </div>
        </div>
      </header>

      {fb && "error" in fb ? (
        <p className="rounded-panel bg-paper p-6 text-muted">{fb.error}</p>
      ) : fb ? (
        <>
          <section className="flex flex-col gap-8 rounded-hero bg-night p-6 text-night-ink sm:flex-row sm:items-center sm:p-10">
            <div className={`${scoreColor(fb.score)} brightness-150`}>
              <ScoreRing score={fb.score} onDark />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs text-night-ink/60">[ Feedback ]</span>
              <p className="max-w-3xl text-xl sm:text-2xl">{fb.summary}</p>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            {SECTIONS.map(({ key, title, dot, empty }) => (
              <div key={key} className="flex min-w-0 flex-col gap-4 rounded-panel bg-paper p-6">
                <h2 className="flex items-center gap-2 font-medium">
                  <span className={`size-2 rounded-full ${dot}`} />
                  {title}
                  <span className="ml-auto text-sm text-muted tabular-nums">{fb[key].length}</span>
                </h2>
                {fb[key].length ? (
                  <ul className="flex flex-col gap-3 text-sm break-words">
                    {fb[key].map(toPoint).map((p, i) => (
                      <li key={i} className="border-t border-line pt-3">
                        {p.text}
                        {p.t !== null && <JumpLink videoId={s.video_id} t={p.t} />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{empty}</p>
                )}
              </div>
            ))}
          </section>
        </>
      ) : null}

      {!!s.notes?.length && (
        <section className="mt-16 grid gap-6 px-2 lg:grid-cols-[1fr_3fr]">
          <Label>Notes while watching</Label>
          <ol className="flex max-w-4xl flex-col">
            {s.notes.map((n, i) => (
              <li key={i} className="flex gap-4 border-t border-line py-3 first:border-t-0 first:pt-0">
                <Link
                  href={`/watch/${s.video_id}?t=${n.t}`}
                  className="w-16 shrink-0 font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {fmtTime(n.t)}
                </Link>
                <p className="min-w-0 break-words">{n.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-16 grid gap-6 px-2 lg:grid-cols-[1fr_3fr]">
        <Label>Your recap</Label>
        <p className="max-w-4xl text-xl leading-relaxed break-words whitespace-pre-wrap">{s.recap}</p>
      </section>
    </main>
  );
}
