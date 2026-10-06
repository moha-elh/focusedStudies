import Link from "next/link";
import { redirect } from "next/navigation";
import { listSessions } from "@/lib/db";
import { parseVideoId } from "@/lib/youtube";
import StartButton from "./start-button";
import { Label, Mark, scoreColor, scoreOf, Thumb } from "./ui";

async function start(formData: FormData) {
  "use server";
  const id = parseVideoId(String(formData.get("url") ?? ""));
  redirect(id ? `/watch/${id}` : "/?invalid=1#start");
}

// Each bar sits a little lower than the last, like a production timeline.
const STEPS = [
  { name: "Watch", offset: "", text: "Just the video. No sidebar, comments or autoplay pulling you somewhere else." },
  { name: "Recall", offset: "lg:mt-12", text: "When it ends, write what you learned from memory, in your own words." },
  { name: "Compare", offset: "lg:mt-24", text: "Your recap is checked against the transcript: what you nailed, missed or got wrong." },
  { name: "Revisit", offset: "lg:mt-36", text: "Come back to the same video, add to your notes, and watch your score climb." },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const { invalid } = await searchParams;
  const sessions = await listSessions();
  const latest = sessions[0];
  const latestScore = latest ? scoreOf(latest.feedback) : null;
  const scores = sessions.map((s) => scoreOf(s.feedback)).filter((n) => n !== null);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <main className="flex flex-col gap-24">
      {/* Hero */}
      <section id="start" className="relative flex min-h-[680px] flex-col overflow-hidden rounded-hero bg-panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.jpg"
          alt="A calm lake between green hills"
          className="absolute inset-x-0 bottom-0 h-[72%] w-full object-cover [mask-image:linear-gradient(to_bottom,transparent,black_35%)]"
        />

        <div className="relative flex flex-col justify-between gap-8 p-6 sm:p-10 lg:flex-row">
          <h1 className="text-hero font-medium sm:text-mark">
            <Mark />
          </h1>
          <div className="flex max-w-xs flex-col gap-3 lg:pt-4">
            <Label>Built for deep learning</Label>
            <p className="text-sm text-ink/80">
              Watch one YouTube video without the noise. Then explain it in your own words and see what actually stuck.
            </p>
          </div>
        </div>

        <div className="relative mt-auto flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <form action={start} className="flex w-full max-w-xl flex-col gap-2 rounded-panel bg-paper/90 p-2 sm:flex-row">
            <input
              name="url"
              required
              aria-label="YouTube link"
              placeholder="Paste a YouTube link…"
              className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-3 outline-none placeholder:text-muted"
            />
            <StartButton />
          </form>

          {latest && (
            <Link href={`/library/${latest.id}`} className="group flex w-full max-w-72 flex-col gap-3 rounded-panel bg-paper/90 p-3">
              <Thumb videoId={latest.video_id} className="w-full" />
              <div className="flex items-start justify-between gap-3 px-1 pb-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{latest.title ?? latest.video_id}</p>
                  <p className="text-xs text-muted">
                    Last watched{latestScore !== null && <> · <span className={scoreColor(latestScore)}>{latestScore}/100</span></>}
                  </p>
                </div>
                <span aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span>
              </div>
            </Link>
          )}
        </div>
      </section>
      {invalid && (
        <p className="-mt-20 px-2 text-sm text-bad">That doesn&apos;t look like a YouTube video link. Try copying it again.</p>
      )}

      {/* Statement */}
      <section className="grid gap-6 px-2 lg:grid-cols-[1fr_3fr]">
        <Label>Why FocusLearn</Label>
        <p className="max-w-4xl text-2xl font-medium sm:text-display">
          We believe the best way to learn from a video isn&apos;t watching more, but{" "}
          <span className="text-muted">
            remembering more. Close the tab on distraction, say it back in your own words, and find out what you really
            understood.
          </span>
        </p>
      </section>

      {/* Process */}
      <section id="process" className="flex scroll-mt-6 flex-col gap-10 px-2">
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr_1fr]">
          <Label>Process</Label>
          <h2 className="text-display font-medium">
            From watching
            <br />
            to knowing.
          </h2>
          <p className="text-sm text-muted">
            Four steps that turn a passive video into something you can explain. Takes about as long as the video
            itself.
          </p>
        </div>

        <ol className="grid grid-cols-2 gap-x-px gap-y-10 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.name} className="flex flex-col gap-4">
              <div className="flex h-24 flex-col border-l lg:h-56 border-line">
                <span className={`${s.offset} w-full bg-ink px-3 py-2 text-sm text-paper`}>{s.name}</span>
                <span className="mt-auto pl-3 text-xs text-muted">0{i + 1}</span>
              </div>
              <div className="rounded-panel bg-paper p-5">
                <p className="font-medium">{s.name}</p>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Recently learned */}
      {sessions.length > 0 && (
        <section className="flex flex-col gap-10 px-2">
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr_1fr]">
            <Label>Your notes</Label>
            <h2 className="text-display font-medium">Notes between frames.</h2>
            <Link href="/library" className="text-sm transition-colors hover:text-muted lg:justify-self-end">
              Open library ↗
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
            <div className="flex flex-col justify-between gap-10 rounded-panel bg-night p-6 text-night-ink">
              <span className="text-sm text-night-ink/60">Average score</span>
              <div>
                <p className="text-hero font-medium">{avg ?? "–"}</p>
                <p className="text-sm text-night-ink/60">
                  across {sessions.length} {sessions.length === 1 ? "video" : "videos"}
                </p>
              </div>
              <Link href="/library" className="w-fit rounded-full bg-night-ink px-4 py-2 text-sm text-night transition-opacity hover:opacity-85">
                See everything ↗
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {sessions.slice(0, 4).map((s) => {
                const score = scoreOf(s.feedback);
                return (
                  <Link key={s.id} href={`/library/${s.id}`} className="group flex flex-col gap-4 rounded-panel bg-paper p-5">
                    <p className="line-clamp-3 text-xl font-medium break-words">“{s.recap}”</p>
                    <div className="mt-auto flex items-center gap-3">
                      <Thumb videoId={s.video_id} className="w-16" />
                      <p className="min-w-0 flex-1 truncate text-sm text-muted group-hover:text-ink">{s.title ?? s.video_id}</p>
                      {score !== null && <span className={`text-sm font-medium ${scoreColor(score)}`}>{score}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
