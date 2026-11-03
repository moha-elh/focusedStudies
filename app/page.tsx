import Link from "next/link";
import { redirect } from "next/navigation";
import { listSessions, type Session } from "@/lib/db";
import { currentUser } from "@/lib/supabase";
import { parseVideoId } from "@/lib/youtube";
import HeroCta, { Burst } from "./hero-cta";
import { ScrollToSection } from "./nav-links";
import { ClosingCta, Extension, Faq, Marquee, Story } from "./story";
import SplitText from "./SplitText";
import StructuredData from "./structured-data";
import { avgScore, Label, scoreColor, scoreOf, Thumb } from "./ui";

async function start(formData: FormData) {
  "use server";
  const id = parseVideoId(String(formData.get("url") ?? ""));
  redirect(id ? `/watch/${id}` : "/?invalid=1");
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
        <img src="/hero.webp" alt="" className="hero-img absolute inset-0 size-full object-cover object-[50%_60%]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-b from-canvas/0 to-canvas" />

        <div className="wrap relative flex flex-1 flex-col items-center pt-12 text-center sm:pt-16">
          {user ? (
            <h1 className="rise mb-6 max-w-[620px] text-display sm:text-hero">
              {/* nowrap keeps "remember today?" together on the second line. */}
              What will you <span className="whitespace-nowrap"><span className="text-sun">remember</span> today?</span>
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

      <ScrollToSection />
      {user ? (
        <>
          <SignedIn sessions={sessions} />
          <Process />
        </>
      ) : (
        <>
          <StructuredData />
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

const date = (s: Session) => new Date(s.updated_at ?? s.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" });

// A recap means there's feedback to read; without one the video is still in progress, so go back to it.
const href = (s: Session) => (s.recap ? `/library/${s.id}` : `/watch/${s.video_id}`);

function Status({ s }: { s: Session }) {
  const score = scoreOf(s.feedback);
  const notes = `${s.notes?.length ?? 0} ${s.notes?.length === 1 ? "note" : "notes"}`;
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
      {score !== null ? (
        <span className={`font-semibold tabular-nums ${scoreColor(score)}`}>Score {score}</span>
      ) : (
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-sun" />
          Still watching
        </span>
      )}
      <span aria-hidden>·</span>
      {notes}
      <span aria-hidden>·</span>
      {date(s)}
    </span>
  );
}

// Returning learners: the last video front and centre, then the rest of what they've been learning.
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

  const [last, ...rest] = sessions;
  const avg = avgScore(sessions);

  return (
    <>
      {/* Continue: a big card, the one thing most returning learners came back for. */}
      <section className="wrap pt-16">
        <Label className="reveal mb-4">Pick up where you left off</Label>
        <Link
          href={`/watch/${last.video_id}`}
          className="reveal group grid items-center gap-6 rounded-hero bg-paper p-4 transition-colors hover:bg-sky/40 sm:p-5 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-10"
        >
          <span className="relative block overflow-hidden rounded-panel">
            <Thumb videoId={last.video_id} className="w-full transition-transform duration-500 group-hover:scale-[1.03]" />
            {/* The hero's starburst play button, so "continue" reads as the same action. */}
            <span aria-hidden className="absolute inset-0 grid place-items-center">
              <span className="burst relative grid size-20 place-items-center group-hover:scale-110">
                <Burst icon="size-7 -translate-x-[2%]" />
              </span>
            </span>
          </span>
          <span className="flex min-w-0 flex-col items-start gap-4 lg:pr-6">
            <span className="line-clamp-3 text-display font-semibold break-words sm:text-h1">{last.title ?? last.video_id}</span>
            <Status s={last} />
            <span className="btn mt-2">{last.recap ? "Rewatch and add notes ↗" : "Continue watching ↗"}</span>
          </span>
        </Link>
      </section>

      {rest.length > 0 && (
        <section className="wrap pt-24">
          <div className="reveal mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <Label className="mb-4">Your library</Label>
              <h2 className="text-display font-semibold sm:text-h1">Recently learned.</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <p className="text-muted">
                <span className="font-semibold text-ink tabular-nums">{sessions.length}</span> {sessions.length === 1 ? "video" : "videos"}
                {avg !== null && (
                  <>
                    {" · average "}
                    <span className={`font-semibold tabular-nums ${scoreColor(avg)}`}>{avg}</span>
                  </>
                )}
              </p>
              <Link href="/library" className="py-3 font-semibold transition-colors hover:text-link">Open library ↗</Link>
            </div>
          </div>

          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {rest.slice(0, 6).map((s) => (
              <li key={s.id} className="reveal">
                <Link href={href(s)} className="group flex flex-col gap-4">
                  <span className="block overflow-hidden rounded-panel">
                    <Thumb videoId={s.video_id} className="w-full transition-transform duration-500 group-hover:scale-[1.04]" />
                  </span>
                  <span className="flex flex-col gap-2">
                    <span className="line-clamp-2 text-xl font-semibold break-words transition-colors group-hover:text-link">{s.title ?? s.video_id}</span>
                    {s.recap && <span className="line-clamp-2 leading-normal text-muted">“{s.recap}”</span>}
                    <Status s={s} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
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
