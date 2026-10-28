import Link from "next/link";
import { listSessions } from "@/lib/db";
import { avgScore, Label, scoreColor, scoreOf, Thumb } from "../ui";

export default async function Library() {
  const sessions = await listSessions();
  const avg = avgScore(sessions);

  return (
    <main className="wrap flex flex-col pt-10">
      <header className="rise flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-8">
        <div>
          <Label className="mb-4">Library</Label>
          <h1 className="text-h1 font-semibold sm:text-hero">Everything you&apos;ve learned.</h1>
        </div>
        {sessions.length > 0 && (
          <dl className="flex gap-12">
            <div>
              <dt className="text-muted">Videos</dt>
              <dd className="text-h1 font-semibold tabular-nums">{sessions.length}</dd>
            </div>
            {avg !== null && (
              <div>
                <dt className="text-muted">Average</dt>
                <dd className={`text-h1 font-semibold tabular-nums ${scoreColor(avg)}`}>{avg}</dd>
              </div>
            )}
          </dl>
        )}
      </header>

      {!sessions.length ? (
        <section className="rise relative mt-8 overflow-hidden rounded-[32px] bg-[#4d8fd9] [--d:150ms]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero2.webp" alt="" className="absolute inset-0 size-full object-cover object-[50%_70%]" />
          <div className="relative m-4 flex max-w-md flex-col gap-4 rounded-panel bg-paper p-6 sm:m-10">
            <h2 className="text-2xl font-semibold">Your first lesson is one link away.</h2>
            <p className="leading-normal text-muted">
              Pick a video you&apos;ve been meaning to learn from. Watch it here, write what you remember, and it&apos;ll
              be saved with your feedback.
            </p>
            <Link href="/?paste=1#start" className="btn self-start">Pick a video ↗</Link>
          </div>
        </section>
      ) : (
        <ul>
          {sessions.map((s, i) => {
            const score = scoreOf(s.feedback);
            return (
              <li key={s.id} className="rise border-b border-line" style={{ "--d": `${Math.min(i, 8) * 60}ms` } as React.CSSProperties}>
                <Link
                  href={`/library/${s.id}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-0 py-5 transition-colors hover:bg-paper sm:grid-cols-[auto_1fr_auto_auto] sm:gap-8 sm:px-5"
                >
                  <Thumb videoId={s.video_id} className="w-28 transition-transform duration-300 group-hover:scale-[1.03] sm:w-52" />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="line-clamp-2 font-semibold break-words sm:text-xl">{s.title ?? s.video_id}</p>
                    <p className="hidden truncate text-muted sm:block">{s.recap}</p>
                  </div>
                  <span className="hidden text-sm whitespace-nowrap text-muted sm:block">
                    {new Date(s.updated_at ?? s.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className={`w-12 text-right text-2xl font-semibold tabular-nums sm:text-display ${score !== null ? scoreColor(score) : "text-muted"}`}>
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
