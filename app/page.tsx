import Link from "next/link";
import { redirect } from "next/navigation";
import { listSessions } from "@/lib/db";
import { parseVideoId } from "@/lib/youtube";
import StartButton from "./start-button";
import { scoreColor, scoreOf, Thumb } from "./ui";

async function start(formData: FormData) {
  "use server";
  const id = parseVideoId(String(formData.get("url") ?? ""));
  redirect(id ? `/watch/${id}` : "/?invalid=1");
}

const STEPS = [
  ["Watch", "Just the video. No recommendations, comments or autoplay."],
  ["Recall", "When it ends, explain what you learned from memory."],
  ["Compare", "Your recap is checked against the transcript: what you nailed, missed or got wrong."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const { invalid } = await searchParams;
  const recent = (await listSessions()).slice(0, 3);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 pt-16 pb-24 sm:px-6 sm:pt-24">
      <section className="flex max-w-2xl flex-col gap-6">
        <h1 className="text-display font-semibold">
          Watch one thing. <span className="text-accent">Actually learn it.</span>
        </h1>
        <p className="text-xl text-muted">
          Paste a YouTube link and watch it without the noise. Then explain it in your own words and see what stuck.
        </p>

        <form action={start} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="url"
            required
            autoFocus
            aria-label="YouTube link"
            placeholder="youtube.com/watch?v=…"
            className="min-w-0 flex-1 rounded-control border border-line bg-surface px-4 py-3 outline-none transition placeholder:text-muted/60 focus:border-accent"
          />
          <StartButton />
        </form>
        {invalid && <p className="text-sm text-bad">That doesn&apos;t look like a YouTube video link. Try copying it again.</p>}
      </section>

      <ol className="grid gap-8 border-t border-line pt-8 sm:grid-cols-3">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="flex flex-col gap-1">
            <span className="text-sm text-accent">Step {i + 1}</span>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm leading-relaxed text-muted">{text}</p>
          </li>
        ))}
      </ol>

      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <h2 className="text-xl font-semibold">Recently learned</h2>
            <Link href="/library" className="text-sm text-muted transition-colors hover:text-ink">View library</Link>
          </div>
          {recent.map((s) => {
            const score = scoreOf(s.feedback);
            return (
              <Link key={s.id} href={`/library/${s.id}`} className="group flex items-center gap-4 py-2">
                <Thumb videoId={s.video_id} className="w-24" />
                <p className="min-w-0 flex-1 truncate transition-colors group-hover:text-accent">{s.title ?? s.video_id}</p>
                {score !== null && <span className={`text-xl font-semibold tabular-nums ${scoreColor(score)}`}>{score}</span>}
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
