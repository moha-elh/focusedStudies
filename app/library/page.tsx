import Link from "next/link";
import { listSessions } from "@/lib/db";
import { Label, scoreColor, scoreOf, Thumb } from "../ui";

export default async function Library() {
  const sessions = await listSessions();
  const scores = sessions.map((s) => scoreOf(s.feedback)).filter((n) => n !== null);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <main className="flex flex-col gap-10">
      <header className="grid gap-6 px-2 pt-6 lg:grid-cols-[1fr_2fr_1fr] lg:items-end">
        <Label>Library</Label>
        <h1 className="text-h1 font-medium sm:text-hero">Everything you&apos;ve learned.</h1>
        {sessions.length > 0 && (
          <dl className="flex gap-8 lg:justify-self-end">
            <div>
              <dt className="text-xs text-muted">Videos</dt>
              <dd className="text-display font-medium">{sessions.length}</dd>
            </div>
            {avg !== null && (
              <div>
                <dt className="text-xs text-muted">Average</dt>
                <dd className={`text-display font-medium ${scoreColor(avg)}`}>{avg}</dd>
              </div>
            )}
          </dl>
        )}
      </header>

      {!sessions.length ? (
        <section className="relative overflow-hidden rounded-hero bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
          <div className="relative m-4 flex max-w-md flex-col gap-4 rounded-panel bg-paper/90 p-6 sm:m-10">
            <h2 className="text-2xl font-medium">Your first lesson is one link away.</h2>
            <p className="text-sm text-muted">
              Pick a video you&apos;ve been meaning to learn from. Watch it here, write what you remember, and it&apos;ll
              be saved with your feedback.
            </p>
            <Link href="/" className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-85">
              Pick a video ↗
            </Link>
          </div>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => {
            const score = scoreOf(s.feedback);
            return (
              <li key={s.id}>
                <Link
                  href={`/library/${s.id}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-panel bg-paper p-3 pr-6 transition-colors hover:bg-panel sm:gap-6"
                >
                  <Thumb videoId={s.video_id} className="w-28 sm:w-48" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-medium line-clamp-2">{s.title ?? s.video_id}</p>
                    <p className="hidden text-sm text-muted line-clamp-1 sm:block">{s.recap}</p>
                    <p className="text-xs text-muted">
                      {new Date(s.updated_at ?? s.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-2xl font-medium tabular-nums sm:text-display ${score !== null ? scoreColor(score) : "text-muted"}`}>
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
