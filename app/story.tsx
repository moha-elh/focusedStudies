import Link from "next/link";
import {
  siAirbnb, siApple, siDuolingo, siFigma, siGithub, siMeta, siNetflix, siNotion, siNvidia, siShopify, siSpotify,
} from "simple-icons";
import { Burst } from "./hero-cta";
import { Label, ScoreRing } from "./ui";

// Signed-out landing story: the four steps told with mockups of the real screens, panels warming from sky to sun.
// The mockups are plain markup styled like the app, not screenshots, so they stay sharp and on-palette.

// 3Blue1Brown, "But what is a neural network?" Timestamps below are real moments from its English transcript.
const VIDEO = { id: "aircAruvnKk", title: "But what is a neural network? | Deep learning chapter 1" };

const PLAY = "M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z";

function Still({ className = "", hd = false }: { className?: string; hd?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://i.ytimg.com/vi/${VIDEO.id}/${hd ? "maxresdefault" : "mqdefault"}.jpg`} alt="" className={`object-cover ${className}`} />;
}

function MockWatch() {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_210px]">
      <div className="relative aspect-video overflow-hidden rounded-panel bg-night">
        <Still hd className="absolute inset-0 size-full" />
        <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-xs">
          <span aria-hidden className="size-1.5 rounded-full bg-sun" />
          Focus mode, sponsors skipped
        </span>
        <span className="absolute inset-0 m-auto grid size-14 place-items-center rounded-full bg-paper shadow-[0_8px_24px_rgb(26_33_48/0.25)]">
          <svg viewBox="0 0 24 24" aria-hidden className="size-6 -translate-x-[2%] fill-ink"><path d={PLAY} /></svg>
        </span>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-paper/30"><div className="h-full w-[38%] bg-sun" /></div>
      </div>
      <div className="flex flex-col gap-2 rounded-panel bg-paper p-3">
        <p className="px-1 pb-1 font-semibold">Notes</p>
        {[["2:52", "A neuron is just a thing that holds a number"], ["4:03", "Hidden layers sit between input and output"], ["9:16", "Weights are just numbers"]].map(([t, text]) => (
          <div key={t} className="flex items-start gap-2 text-sm leading-normal">
            <span className="pill-time shrink-0">{t}</span>
            <span className="min-w-0">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockRecall() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-panel bg-paper p-5 sm:p-6">
      <p className="text-2xl font-semibold">What did you learn?</p>
      <p className="flex-1 rounded-media border border-line bg-white p-4 leading-normal">
        A neural network is layers of neurons, and each neuron just holds a number called its activation. The first layer
        is the 784 pixels of the image, and the hidden layers pick out edges, then bigger patterns<span aria-hidden className="caret" />
      </p>
      <span className="text-sm text-muted">37 words</span>
      <div className="rounded-media bg-night p-4 text-night-ink">
        <p className="mb-1 font-semibold">Stuck? Try answering</p>
        {["What was the main idea, in one sentence?", "Which example stuck with you?"].map((q, i) => (
          <p key={q} className="flex gap-3 border-t border-night-2 py-3 text-sm leading-normal last:pb-0">
            <span className="font-semibold text-sun tabular-nums">0{i + 1}</span>
            {q}
          </p>
        ))}
      </div>
    </div>
  );
}

function MockCompare() {
  const rows = [
    ["You got right", "text-good", "Each neuron holds a number, its activation", "3:25"],
    ["You missed", "text-mid", "Weights and biases are the numbers the network learns", "9:16"],
    ["Not quite right", "text-bad", "Layers aren't told to find edges; that's what training hopes they learn", "6:59"],
  ];
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-5 rounded-panel bg-night p-5 text-night-ink">
        <div className="text-good-n"><ScoreRing score={78} size={88} onDark /></div>
        <p className="min-w-0 leading-normal">You explained the layers clearly. How weights and biases shape each neuron was the big piece you left out.</p>
      </div>
      <ul className="flex-1 rounded-panel bg-paper px-5">
        {rows.map(([label, color, text, t]) => (
          <li key={label} className="flex flex-col items-start gap-2 border-b border-line py-4 last:border-b-0">
            <span className={`text-sm font-semibold ${color}`}>{label}</span>
            <span className="leading-normal">{text}</span>
            <span className="pill-time"><span aria-hidden className="text-xs">▶</span> {t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MockRevisit() {
  const rows = [
    ["First watch", "2 notes", "61", "text-mid"],
    ["After a rewatch", "5 notes, recap updated", "84", "text-good"],
  ];
  return (
    <ul className="flex flex-col gap-3">
      {rows.map(([when, detail, score, color]) => (
        <li key={when} className="flex items-center gap-4 rounded-panel bg-paper p-3 sm:p-4">
          <Still className="aspect-video w-24 shrink-0 rounded-media sm:w-32" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate font-semibold">{VIDEO.title}</span>
            <span className="truncate text-sm text-muted">{when} · {detail}</span>
          </span>
          <span className={`text-display font-semibold tabular-nums ${color}`}>{score}</span>
        </li>
      ))}
    </ul>
  );
}

const CHAPTERS = [
  { name: "Watch", bg: "bg-sky", text: "Just the video. No sidebar, comments, autoplay or sponsor reads. Jot notes as you go; each one keeps its moment.", mock: <MockWatch /> },
  { name: "Recall", bg: "bg-sky-2", text: "When it ends, write what you learned from memory, in your own words.", mock: <MockRecall /> },
  { name: "Compare", bg: "bg-sun-soft", text: "Your recap is checked against the transcript: what you nailed, missed or got wrong, each linked to its moment.", mock: <MockCompare /> },
  { name: "Revisit", bg: "bg-sun", text: "Rewatch, add to your notes and re-check. Your score shows what stuck.", mock: <MockRevisit /> },
];

export function Story() {
  return (
    <section id="process" className="wrap scroll-mt-6">
      <div className="reveal mb-16 max-w-[720px]">
        <Label className="mb-4">How it works</Label>
        <h2 className="text-display font-semibold sm:text-h1">From watching to knowing.</h2>
        <p className="mt-4 text-xl leading-normal text-muted">Made for lectures, coding tutorials, talks and online courses: anything with a point worth keeping.</p>
      </div>

      {/* Watch and Revisit are full-width rows; Recall and Compare share one row in two columns,
          as subgrids so their text and mockups line up. */}
      <ol className="grid gap-x-8 gap-y-24 sm:gap-y-32 lg:grid-cols-2">
        {CHAPTERS.map((c, i) => {
          const wide = i === 0 || i === CHAPTERS.length - 1;
          const intro = (
            <div className={`reveal flex flex-col gap-4 ${wide && i % 2 ? "lg:order-2" : ""}`}>
              <h3 className="flex items-center gap-4 text-display font-semibold sm:text-h1">
                <span className={`grid size-12 shrink-0 place-items-center rounded-full text-xl ${c.bg}`}>0{i + 1}</span>
                {c.name}
              </h3>
              <p className="max-w-[440px] text-xl leading-normal text-muted">{c.text}</p>
            </div>
          );
          const mock = <div aria-hidden className={`reveal flex flex-col rounded-hero p-4 sm:p-8 ${c.bg} *:flex-1`}>{c.mock}</div>;
          return (
            <li
              key={c.name}
              className={
                wide
                  ? `grid items-center gap-8 lg:col-span-2 lg:gap-16 ${i % 2 ? "lg:grid-cols-[7fr_4fr]" : "lg:grid-cols-[4fr_7fr]"}`
                  : "grid gap-8 lg:row-span-2 lg:grid-rows-subgrid"
              }
            >
              {intro}
              {mock}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Joke social proof until there's real proof; the caption makes clear these companies don't endorse anything.
// Marks from Simple Icons (CC0), shown in one muted colour.
const COMPANIES = [siApple, siNetflix, siSpotify, siAirbnb, siMeta, siShopify, siNotion, siFigma, siDuolingo, siNvidia, siGithub];

export function Marquee() {
  return (
    <section className="pt-10 pb-4">
      <p className="wrap mb-6 text-center text-sm text-muted">Trusted by people who breathe the same air as people at these companies</p>
      <div className="marquee overflow-hidden">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            // The second copy makes the loop seamless; screen readers only get the first.
            <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0">
              {COMPANIES.map((c) => (
                <li key={c.slug} className="flex items-center gap-3 px-8 whitespace-nowrap text-ink/40 sm:px-10">
                  <svg viewBox="0 0 24 24" aria-hidden className="size-7 shrink-0 fill-current"><path d={c.path} /></svg>
                  <span className="text-2xl font-semibold">{c.title}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

// A video page with all its usual noise, and the extension's button waiting in the corner.
function MockYouTube() {
  return (
    <div className="relative overflow-hidden rounded-panel bg-white text-ink">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="h-5 w-7 shrink-0 rounded-md bg-[#e5484d]" />
        <span className="flex h-9 max-w-[320px] flex-1 items-center rounded-full border border-line px-4 text-sm text-muted">Search</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_190px]">
        <div className="min-w-0">
          <Still hd className="aspect-video w-full rounded-media" />
          <p className="mt-3 truncate font-semibold">{VIDEO.title}</p>
          <p className="mt-1 text-sm text-muted">3Blue1Brown</p>
        </div>
        {/* The noise: recommendations pulling you elsewhere. */}
        <div className="hidden flex-col gap-3 opacity-40 sm:flex">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <span className="aspect-video w-20 shrink-0 rounded-media bg-panel" />
              <span className="flex flex-1 flex-col gap-1.5 pt-1">
                <span className="h-2.5 rounded-full bg-panel" />
                <span className="h-2.5 w-2/3 rounded-full bg-panel" />
              </span>
            </div>
          ))}
        </div>
      </div>
      <span className="absolute right-4 bottom-4 inline-flex items-center gap-2.5 rounded-full bg-paper py-2 pr-4 pl-2 text-sm font-semibold shadow-[0_6px_24px_rgb(0_0_0/0.25)]">
        <span className="grid size-7 place-items-center rounded-lg bg-night text-paper">F</span>
        Open in FocusLearn ↗
      </span>
    </div>
  );
}

// The FocusLearn side of the handoff: same video, same second, none of the noise.
function MockHandoff() {
  return (
    <div className="w-[230px] rounded-panel bg-paper p-3 text-ink shadow-[0_16px_40px_rgb(0_0_0/0.35)] sm:w-[260px]">
      <div className="relative overflow-hidden rounded-media">
        <Still className="aspect-video w-full" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-paper/30"><div className="h-full w-[38%] bg-sun" /></div>
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-sun" />
        Continues at 6:59, in focus mode
      </p>
    </div>
  );
}

const HANDOFF_STEPS = [
  ["Click the button", "“Open in FocusLearn” sits on every YouTube video."],
  ["YouTube pauses", "Nothing keeps playing in the other tab."],
  ["Pick up at the same second", "Notes and recall are ready where you left off."],
];

export function Extension() {
  return (
    <section className="wrap pt-32">
      <div className="reveal grid items-center gap-12 rounded-[32px] bg-night p-6 text-night-ink sm:p-12 lg:grid-cols-[4fr_7fr]">
        <div className="flex flex-col gap-6">
          <span className="flex items-center gap-2.5 text-sm text-night-muted">
            <span aria-hidden className="size-2 rounded-full bg-sun" />
            Browser extension · Chrome and Edge
          </span>
          <h2 className="text-display font-semibold sm:text-h1">Works where you watch.</h2>
          <p className="text-xl leading-normal text-night-muted">Already on YouTube? Leave the noise mid-video.</p>
          <ol className="flex flex-col">
            {HANDOFF_STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-4 border-t border-night-2 py-4">
                <span className="font-semibold text-sun tabular-nums">0{i + 1}</span>
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">{title}</span>
                  <span className="text-sm leading-normal text-night-muted">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        {/* YouTube with its noise, and FocusLearn picking up on top of it. */}
        <div aria-hidden className="relative pt-10 sm:pt-12">
          <div className="sm:mr-16"><MockYouTube /></div>
          <div className="absolute top-0 right-0"><MockHandoff /></div>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ["Is it free?", "Yes, right now it's free to use. All you need is an email address to sign in."],
  ["Does the video need captions?", "Yes, for grading: your recap is checked against the video's transcript. Without captions you can still watch and take notes."],
  ["What videos work best?", "Ones with a clear point: lectures, tutorials, talks and courses. Very long videos (over an hour or so) may be too long to grade."],
  ["Is my library private?", "Yes. Your notes, recaps and scores are tied to your account, and only you can see them."],
  ["Do I need to install anything?", "No. Everything runs in the browser. The extension is optional; it just adds a shortcut from YouTube."],
];

export function Faq() {
  return (
    <section className="wrap pt-32">
      <div className="grid gap-8 lg:grid-cols-[4fr_7fr] lg:gap-16">
        <div className="reveal">
          <Label className="mb-4">Questions</Label>
          <h2 className="text-display font-semibold sm:text-h1">Good to know.</h2>
        </div>
        <div className="reveal flex flex-col gap-3 rounded-hero bg-sun-soft p-4 sm:p-8">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-panel bg-paper">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 text-xl font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-sun-soft text-xl transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-5 pb-5 leading-normal text-muted sm:px-6">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="wrap pt-32">
      {/* Bookends the hero: same meadow, same starburst play button. */}
      <div className="reveal relative flex min-h-[520px] flex-col items-center overflow-hidden rounded-[32px] bg-[#4d8fd9] px-6 pt-12 text-center sm:min-h-[600px] sm:pt-14">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero2.webp" alt="" className="absolute inset-0 size-full object-cover object-[50%_20%]" />
        <div className="relative flex flex-col items-center gap-6">
          <h2 className="max-w-[760px] text-display font-semibold sm:text-hero">
            Pick one video you&apos;ve been meaning to <span className="text-sun">learn from.</span>
          </h2>
          <Link href="/login" aria-label="Sign in to start" className="burst relative grid size-20 place-items-center sm:size-24">
            <Burst icon="size-7 -translate-x-[2%] sm:size-8" />
          </Link>
        </div>
      </div>
    </section>
  );
}
