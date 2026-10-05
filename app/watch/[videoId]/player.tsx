"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner, Thumb } from "../../ui";

type YTPlayer = { pauseVideo(): void; playVideo(): void };

declare global {
  interface Window {
    YT: { Player: new (el: HTMLElement, opts: object) => YTPlayer; PlayerState: { ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PROMPTS = [
  "What was the main idea, in one sentence?",
  "What were the key points or steps?",
  "Which example or story stuck with you?",
  "How will you use this?",
];

type Props = { videoId: string; title: string | null; previousRecap: string };

export default function Player({ videoId, title, previousRecap }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer>(null);
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [recap, setRecap] = useState(previousRecap ? previousRecap + "\n\n" : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const words = recap.trim() ? recap.trim().split(/\s+/).length : 0;

  useEffect(() => {
    const create = () => {
      player.current = new window.YT.Player(host.current!, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onStateChange: (e: { data: number }) => e.data === window.YT.PlayerState.ENDED && setDone(true) },
      });
    };
    if (window.YT?.Player) create();
    else {
      window.onYouTubeIframeAPIReady = create;
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
  }, [videoId]);

  function finish() {
    player.current?.pauseVideo();
    setDone(true);
  }

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, recap }),
    });
    const json = await res.json().catch(() => ({ error: "Something went wrong." }));
    if (res.ok) router.push(`/library/${json.id}`);
    else {
      setError(json.error);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-6">
      {/* Kept mounted while recapping so "Back to video" resumes where you left off. */}
      <div className={done ? "hidden" : "flex flex-col gap-4"}>
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 text-xl font-semibold line-clamp-2">{title ?? "Focus session"}</h1>
          <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
            <span className="size-2 rounded-full bg-accent" /> Focus mode
          </span>
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-frame bg-surface">
          <div ref={host} />
        </div>
        <div className="flex flex-col justify-between gap-3 text-sm text-muted sm:flex-row sm:items-center">
          <p>
            {previousRecap
              ? "You've watched this before. When it ends, add to your notes and they'll be re-checked."
              : "When the video ends, you'll explain what you learned in your own words."}
          </p>
          <button
            onClick={finish}
            className="self-start rounded-control border border-line px-4 py-2 text-ink transition hover:border-accent sm:self-auto"
          >
            I&apos;m done watching
          </button>
        </div>
      </div>

      {done && (
        <div className="grid gap-10 pt-4 lg:grid-cols-[1fr_260px]">
          <section className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-display font-semibold">{previousRecap ? "Add to your notes" : "What did you learn?"}</h2>
              <p className="text-muted">
                {previousRecap
                  ? "Your earlier notes are below. Add what you picked up this time; the whole thing gets re-checked."
                  : "From memory, no peeking. We'll compare it with what the video actually said."}
              </p>
            </div>
            <textarea
              value={recap}
              onChange={(e) => setRecap(e.target.value)}
              rows={14}
              autoFocus
              disabled={busy}
              className="w-full resize-y rounded-control border border-line bg-surface p-4 leading-relaxed outline-none transition placeholder:text-muted/50 focus:border-accent disabled:opacity-60"
              placeholder="The video explained that…"
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <span className="text-sm text-muted sm:mr-auto">
                {words} {words === 1 ? "word" : "words"}
                {words > 0 && words < 30 && ", a few more sentences will give better feedback"}
              </span>
              <button onClick={() => setDone(false)} disabled={busy} className="px-3 py-2 text-muted transition-colors hover:text-ink">
                Back to video
              </button>
              <button
                onClick={submit}
                disabled={busy || recap.trim().length < 20}
                className="flex items-center justify-center gap-2 rounded-control bg-accent px-5 py-2.5 font-semibold text-canvas transition hover:brightness-110 disabled:opacity-40"
              >
                {busy && <Spinner />}
                {busy ? "Comparing with the video…" : previousRecap ? "Update and re-check" : "Check my understanding"}
              </button>
            </div>
            {error && <p className="text-sm text-bad">{error}</p>}
          </section>

          <aside className="flex flex-col gap-4 lg:border-l lg:border-line lg:pl-8">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start">
              <Thumb videoId={videoId} className="w-28 lg:w-full" />
              <p className="min-w-0 text-sm text-muted line-clamp-2">{title}</p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Stuck? Try answering</p>
              <ol className="flex list-decimal flex-col gap-2 pl-4 text-sm text-muted marker:text-accent">
                {PROMPTS.map((p) => <li key={p}>{p}</li>)}
              </ol>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
