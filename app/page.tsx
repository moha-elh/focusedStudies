import Link from "next/link";
import { redirect } from "next/navigation";
import { listSessions, type Session } from "@/lib/db";
import { currentUser } from "@/lib/supabase";
import { parseVideoId } from "@/lib/youtube";
import HeroCta from "./hero-cta";
import { ClosingCta, Extension, Faq, Marquee, Story } from "./story";
import SplitText from "./SplitText";
import { avgScore, Label, scoreColor, scoreOf, Thumb } from "./ui";

async function start(formData: FormData) {
  "use server";
  const id = parseVideoId(String(formData.get("url") ?? ""));
  redirect(id ? `/watch/${id}` : "/?invalid=1#start");
}

// Blocks step up like a rising sun: sky to full sun.
const STEPS = [
  { name: "Watch", block: "h-32 bg-sky", text: "Just the video. No sidebar, comments or autoplay pulling you somewhere else." },
  { name: "Recall", block: "h-48 bg-sky-2", text: "When it ends, write what you learned from memory, in your own words." },
  { name: "Compare", block: "h-64 bg-sun-soft", text: "Your recap is checked against the transcript: what you nailed, missed or got wrong." },
  { name: "Revisit", block: "h-80 bg-sun", text: "Come back to the same video, add to your notes, and watch your score climb." },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ invalid?: string; paste?: string }> }) {
  const { invalid, paste } = await searchParams;
  const open = !!(invalid || paste);
  const user = await currentUser();
  const sessions = user ? await listSessions() : [];

  return (
    <main>
      {/* Hero slides up under the layout header (h-21). */}
      <section id="start" className="relative -mt-21 flex min-h-[680px] flex-col overflow-hidden bg-[#4d8fd9] pt-21 sm:min-h-[820px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero2.webp" alt="" className="hero-img absolute inset-0 size-full object-cover object-[50%_60%]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-b from-canvas/0 to-canvas" />

        <div className="wrap relative flex flex-1 flex-col items-center pt-12 text-center sm:pt-16">
          {user ? (
            <h1 className="rise mb-6 max-w-[920px] text-display sm:text-hero">
              What will you <span className="text-sun">remember</span> today?
            </h1>
          ) : (
            <h1 className="rise mb-6 max-w-[920px] text-display sm:text-hero">
              Don&apos;t just finish the video. <span className="text-sun">Remember it.</span>
            </h1>
          )}
          <div className="rise w-full max-w-[600px] [--d:150ms]">
            {/* Remount when the URL asks for the form, so "Paste a link" opens it from anywhere. */}
            <HeroCta key={String(open)} action={start} defaultOpen={open} />
          </div>        </div>
      </section>

      {invalid && (
        <div className="wrap mt-4">
          <p role="alert" className="flex items-center gap-3 rounded-full bg-bad-soft px-6 py-4 text-bad">
            <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-bad text-sm font-semibold text-paper">!</span>
            That doesn&apos;t look like a YouTube video link. Try copying it again.
          </p>
        </div>
      )}

      {user ? (
        <>
          <SignedIn sessions={sessions} />
          <Process />
        </>
      ) : (
        <>
          <Marquee />
          <Statement />
          <Story />
          <Extension />
          <Faq />
          <ClosingCta />
        </>
      )}
    </main>
  );
}

// Returning learners: pick up the last video, then their score and recent recaps.
function SignedIn({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) {
    return (
      <section className="wrap pt-16">
        <div className="reveal flex flex-col gap-2 rounded-panel bg-paper p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Your library is empty, for now.</h2>
          <p className="leading-normal text-muted">Press play above and paste a video you&apos;ve been meaning to learn from. It&apos;ll be saved here with your feedback.</p>
        </div>
      </section>
    );
  }

  const last = sessions[0];
  const lastScore = scoreOf(last.feedback);
  const avg = avgScore(sessions);

  return (
    <>
      {/* Continue */}
      <section className="wrap pt-16">
        <Label className="reveal mb-4">Pick up where you left off</Label>
        <div className="reveal flex flex-col gap-5 rounded-panel bg-paper p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
          <Thumb videoId={last.video_id} className="w-full sm:w-40" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="line-clamp-2 text-xl font-semibold break-words">{last.title ?? last.video_id}</p>
            <p className="text-sm text-muted">
              {last.notes?.length ?? 0} {last.notes?.length === 1 ? "note" : "notes"}
              {lastScore !== null && <> · score <span className={`font-semibold ${scoreColor(lastScore)}`}>{lastScore}</span></>}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={`/watch/${last.video_id}`} className="btn">{last.recap ? "Rewatch and add notes ↗" : "Continue watching ↗"}</Link>
            {last.recap && <Link href={`/library/${last.id}`} className="btn-outline">See feedback</Link>}
          </div>
        </div>
      </section>

      {/* Recently learned */}
      <section className="wrap pt-24">
        <div className="reveal mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Label className="mb-4">Your notes</Label>
            <h2 className="text-display font-semibold sm:text-h1">Notes between frames.</h2>
          </div>
          <Link href="/library" className="py-3 font-semibold transition-colors hover:text-link">Open library ↗</Link>
        </div>

        <div className="flex flex-wrap items-stretch gap-6">
          <div className="reveal flex min-h-[420px] min-w-0 flex-[1_1_320px] flex-col justify-between gap-10 rounded-hero bg-night p-8 text-night-ink">
            <span className="text-night-muted">Average score</span>
            <div>
              <p className={`text-hero font-semibold sm:text-mark ${avg !== null ? scoreColor(avg, true) : ""}`}>{avg ?? "–"}</p>
              <p className="mt-2 text-night-muted">
                across {sessions.length} {sessions.length === 1 ? "video" : "videos"}
              </p>
            </div>
            <Link href="/library" className="btn self-start bg-paper text-ink hover:bg-sky">See everything ↗</Link>
          </div>

          <ul className="grid min-w-0 flex-[2_1_600px] grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-x-8 gap-y-2">
            {sessions.filter((s) => s.recap).slice(0, 4).map((s) => {
              const score = scoreOf(s.feedback);
              return (
                <li key={s.id} className="reveal border-t border-line pt-5 pb-4">
                  <Link href={`/library/${s.id}`} className="group flex h-full flex-col justify-between gap-5 transition-transform duration-300 hover:-translate-y-1">
                    <p className="line-clamp-3 text-xl leading-[1.4] break-words">“{s.recap}”</p>
                    <span className="flex min-w-0 items-center gap-3">
                      <Thumb videoId={s.video_id} className="w-16" />
                      <span className="min-w-0 flex-1 truncate text-sm text-muted group-hover:text-ink">{s.title ?? s.video_id}</span>
                      {score !== null && <span className={`text-sm font-semibold ${scoreColor(score)}`}>{score}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}

function Statement() {
  return (
    <section className="wrap py-32">
      <Label className="reveal mb-8">Why FocusLearn</Label>
      {/* Two SplitText runs keep the two-tone sentence; the muted half waits for the first to finish (14 words × 40ms). */}
      <p className="max-w-[1120px] text-display sm:text-h1">
        <SplitText text={"We believe the best way to learn from a video isn’t watching more, but"} />{" "}
        <SplitText className="text-muted" delay={0.56} text="remembering more. Close the tab on distraction, say it back in your own words, and find out what you really understood." />
      </p>
    </section>
  );
}

function Process() {
  return (
    <section id="process" className="wrap scroll-mt-6 pt-32">
      <div className="reveal mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Label className="mb-4">Process</Label>
          <h2 className="text-display font-semibold sm:text-h1">From watching to knowing.</h2>
        </div>
        <p className="max-w-[360px] leading-normal text-muted">
          Four steps that turn a passive video into something you can explain. Takes about as long as the video itself.
        </p>
      </div>

      <ol className="grid grid-cols-2 items-end gap-x-2 gap-y-10 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.name} className="flex flex-col">
            <div className={`${s.block} grow-up rounded-t-panel p-5 text-xl font-semibold`}>0{i + 1}</div>
            <div className="reveal min-h-36 border-t-2 border-ink pt-5">
              <h3 className="mb-2 text-2xl font-semibold">{s.name}</h3>
              <p className="max-w-[280px] leading-normal text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
