import Link from "next/link";
import { notFound } from "next/navigation";
import type { Feedback } from "@/app/api/review/route";
import { getSession } from "@/lib/db";
import { ScoreRing, Thumb } from "../../ui";

const SECTIONS = [
  { key: "covered", title: "You got right", bar: "border-good", empty: "Nothing matched yet." },
  { key: "missed", title: "You missed", bar: "border-accent", empty: "You covered everything important." },
  { key: "incorrect", title: "Not quite right", bar: "border-bad", empty: "No mistakes. Nice." },
] as const;

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession((await params).id);
  if (!s) notFound();
  const fb = s.feedback as Feedback | { error: string } | null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pt-6 pb-24 sm:px-6">
      <Link href="/library" className="w-fit text-sm text-muted transition-colors hover:text-ink">← Library</Link>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Thumb videoId={s.video_id} className="w-full sm:w-52" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-2xl font-semibold line-clamp-3">{s.title ?? s.video_id}</h1>
          <p className="text-sm text-muted">
            {s.updated_at ? "Updated " : ""}
            {new Date(s.updated_at ?? s.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            {" · "}
            <Link href={`/watch/${s.video_id}`} className="text-accent underline-offset-4 hover:underline">
              Rewatch and try again
            </Link>
          </p>
        </div>
      </header>

      {fb && "error" in fb ? (
        <p className="border-l-2 border-accent pl-4 text-muted">{fb.error}</p>
      ) : fb ? (
        <>
          <section className="flex flex-col items-start gap-6 border-y border-line py-8 sm:flex-row sm:items-center">
            <ScoreRing score={fb.score} />
            <p className="max-w-2xl text-xl leading-relaxed">{fb.summary}</p>
          </section>

          <section className="grid gap-10 md:grid-cols-3 md:gap-8">
            {SECTIONS.map(({ key, title, bar, empty }) => (
              <div key={key} className={`flex min-w-0 flex-col gap-3 border-t-2 pt-4 ${bar}`}>
                <h2 className="flex items-baseline justify-between font-semibold">
                  {title}
                  <span className="text-sm text-muted tabular-nums">{fb[key].length}</span>
                </h2>
                {fb[key].length ? (
                  <ul className="flex flex-col gap-3 text-sm leading-relaxed break-words text-ink/85">
                    {fb[key].map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{empty}</p>
                )}
              </div>
            ))}
          </section>
        </>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Your notes</h2>
        <p className="max-w-3xl border-l-2 border-line pl-4 leading-relaxed break-words whitespace-pre-wrap text-ink/85">{s.recap}</p>
      </section>
    </main>
  );
}
