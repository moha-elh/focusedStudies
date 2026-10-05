import Link from "next/link";
import { listSessions } from "@/lib/db";
import { scoreColor, scoreOf, Thumb } from "../ui";

export default async function Library() {
  const sessions = await listSessions();
  const scores = sessions.map((s) => scoreOf(s.feedback)).filter((n) => n !== null);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-12 pb-24 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-display font-semibold">Your library</h1>
        <p className="text-muted">
          {sessions.length
            ? <>{sessions.length} {sessions.length === 1 ? "video" : "videos"}{avg !== null && <> · average score <span className={scoreColor(avg)}>{avg}</span></>}</>
            : "Everything you watch and what you took from it lives here."}
        </p>
      </header>

      {!sessions.length ? (
        <section className="flex max-w-md flex-col gap-4 border-t border-line pt-8">
          <h2 className="text-xl font-semibold">Your first lesson is one link away</h2>
          <p className="text-muted">
            Pick a video you&apos;ve been meaning to learn from. Watch it here, write what you remember, and it&apos;ll be
            saved with your feedback.
          </p>
          <Link href="/" className="w-fit rounded-control bg-accent px-5 py-2.5 font-semibold text-canvas transition hover:brightness-110">
            Pick a video
          </Link>
        </section>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {sessions.map((s) => {
            const score = scoreOf(s.feedback);
            return (
              <li key={s.id}>
                <Link href={`/library/${s.id}`} className="group flex items-center gap-4 py-4 sm:gap-6">
                  <Thumb videoId={s.video_id} className="w-28 sm:w-40" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="font-semibold transition-colors line-clamp-2 group-hover:text-accent">{s.title ?? s.video_id}</p>
                    <p className="hidden text-sm text-muted line-clamp-1 sm:block">{s.recap}</p>
                    <p className="text-xs text-muted">
                      {new Date(s.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`w-12 shrink-0 text-right text-2xl font-semibold tabular-nums ${score !== null ? scoreColor(score) : "text-muted"}`}>
                    {score ?? "–"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
