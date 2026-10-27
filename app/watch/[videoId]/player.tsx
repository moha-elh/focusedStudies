"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/lib/db";
import { fetchSkipSegments, fmtTime } from "@/lib/youtube";
import { Label, Spinner, Thumb } from "../../ui";

type YTPlayer = {
  pauseVideo(): void;
  playVideo(): void;
  // Only present once the player is ready.
  getCurrentTime?(): number;
  getDuration?(): number;
  seekTo?(seconds: number, allowSeekAhead: boolean): void;
};

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

type Props = {
  videoId: string;
  title: string | null;
  start: number;
  previousRecap: string;
  previousNotes: Note[];
  demo: boolean;
};

export default function Player({ videoId, title, start, previousRecap, previousNotes, demo }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer>(null);
  const router = useRouter();
  const draftKey = `draft:${videoId}`;
  const [done, setDone] = useState(false);
  const [recap, setRecap] = useState(previousRecap ? previousRecap + "\n\n" : "");
  const [notes, setNotes] = useState<Note[]>(previousNotes);
  const [noteText, setNoteText] = useState("");
  const [now, setNow] = useState(start);
  const [duration, setDuration] = useState(0);
  const [skips, setSkips] = useState<[number, number][]>([]);
  const [skipped, setSkipped] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const words = recap.trim() ? recap.trim().split(/\s+/).length : 0;

  useEffect(() => {
    const create = () => {
      player.current = new window.YT.Player(host.current!, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start },
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
  }, [videoId, start]);

  useEffect(() => {
    let live = true;
    fetchSkipSegments(videoId).then((s) => live && setSkips(s));
    return () => {
      live = false;
    };
  }, [videoId]);

  // A ticking clock so the note box shows the time a new note will be stamped with,
  // and so playback can jump past sponsor segments as soon as it enters one.
  useEffect(() => {
    const tick = setInterval(() => {
      const t = player.current?.getCurrentTime?.();
      if (typeof t !== "number") return;
      const seg = skips.find(([a, b]) => t >= a && t < b - 0.5);
      if (seg) {
        player.current?.seekTo?.(seg[1], true);
        setSkipped((n) => n + 1);
      }
      setNow(seg ? seg[1] : t);
      setDuration(player.current?.getDuration?.() ?? 0);
    }, 500);
    return () => clearInterval(tick);
  }, [skips]);

  // An unsent recap and notes survive a refresh. If browser storage is unavailable, we just skip the draft.
  // Read after mount (not in useState) so the server-rendered HTML matches the first client render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? "null");
      if (typeof d?.recap === "string" && d.recap.trim()) setRecap(d.recap);
      if (Array.isArray(d?.notes)) setNotes(d.notes);
    } catch {}
    setDraftLoaded(true);
  }, [draftKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ recap, notes }));
    } catch {}
  }, [draftKey, draftLoaded, recap, notes]);

  function addNote(e: React.FormEvent) {
    e.preventDefault();
    const text = noteText.trim();
    if (!text) return;
    const t = Math.floor(player.current?.getCurrentTime?.() ?? now);
    setNotes((all) => [...all, { t, text }].sort((a, b) => a.t - b.t));
    setNoteText("");
  }

  function seek(t: number) {
    player.current?.seekTo?.(t, true);
    player.current?.playVideo();
  }

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
      body: JSON.stringify({ videoId, recap, notes }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({ error: "Something went wrong." })) : { error: "Couldn't reach the server. Your recap is kept, try again." };
    if (res?.ok) {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      router.push(`/library/${json.id}`);
    } else {
      setError(json.error);
      setBusy(false);
    }
  }

  return (
    <main className="wrap flex flex-col gap-6 pt-4">
      {/* Kept mounted while recapping so "Back to video" resumes where you left off. */}
      <div className={done ? "hidden" : "flex flex-col gap-6"}>
        <div className="rise flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <h1 className="min-w-0 text-2xl font-semibold line-clamp-2 break-words sm:text-display">{title ?? "Focus session"}</h1>
          <span className="inline-flex shrink-0 items-center gap-2.5 self-start rounded-full bg-paper px-4 py-2 text-sm lg:self-auto">
            <span aria-hidden className="size-2 rounded-full bg-sun" />
            {skipped ? `Skipped ${skipped} sponsor ${skipped === 1 ? "segment" : "segments"}` : skips.length ? "Focus mode, sponsors skipped" : "Focus mode"}
          </span>
        </div>

        <div className="rise grid gap-6 [--d:100ms] lg:grid-cols-[1fr_340px]">
          <div className="relative aspect-video w-full overflow-hidden rounded-hero bg-panel">
            <div ref={host} />
            {/* Watch progress, in the sun color, along the bottom edge. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-ink/20">
              <div className="h-full bg-sun transition-[width] duration-500 ease-linear" style={{ width: `${duration ? Math.min(100, (now / duration) * 100) : 0}%` }} />
            </div>
          </div>

          <section className="flex max-h-[28rem] min-h-64 flex-col overflow-hidden rounded-hero bg-paper lg:max-h-none">
            <div className="flex items-baseline justify-between border-b border-line px-5 pt-5 pb-4">
              <h2 className="text-xl font-semibold">Notes</h2>
              <span className="text-sm text-muted">{notes.length ? `${notes.length} saved` : "Stamped with the video time"}</span>
            </div>
            <ol className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {notes.length === 0 && (
                <li className="px-2 py-2 leading-normal text-muted">
                  Jot down anything worth keeping. Each note remembers its moment, so you can jump back to it later.
                </li>
              )}
              {notes.map((n, i) => (
                <li key={`${n.t}-${i}`} className="group flex items-start gap-3 rounded-media p-2 transition-colors hover:bg-canvas">
                  <button onClick={() => seek(n.t)} title="Jump to this moment" className="pill-time shrink-0">
                    {fmtTime(n.t)}
                  </button>
                  <p className="min-w-0 flex-1 leading-normal break-words">{n.text}</p>
                  <button
                    onClick={() => setNotes((all) => all.filter((_, j) => j !== i))}
                    aria-label="Delete note"
                    className="text-muted transition-opacity pointer-fine:opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            <form onSubmit={addNote} className="flex items-center gap-2 border-t border-line p-3">
              <span className="w-12 shrink-0 text-center text-sm font-semibold text-muted tabular-nums">{fmtTime(now)}</span>
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                maxLength={1000}
                aria-label="New note"
                placeholder="Add a note…"
                className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-white px-4 outline-none placeholder:text-muted focus:border-ink"
              />
              <button disabled={!noteText.trim()} className="btn min-h-11 px-5 disabled:bg-line disabled:text-muted disabled:opacity-100">
                Add
              </button>
            </form>
          </section>
        </div>

        <div className="rise flex flex-col justify-between gap-4 border-t border-line pt-6 [--d:200ms] sm:flex-row sm:items-center">
          <p className="max-w-xl text-muted">
            {previousRecap
              ? "You've watched this before. When it ends, add to your recap and it'll be re-checked."
              : "When the video ends, you'll explain what you learned in your own words."}
          </p>
          <button onClick={finish} className="btn self-start sm:self-auto">
            I&apos;m done watching ↗
          </button>
        </div>
      </div>

      {done && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rise flex min-w-0 flex-col gap-6 rounded-[32px] bg-paper p-6 sm:p-10 lg:p-14">
            <div className="flex flex-col gap-4">
              <Label>{previousRecap ? "Revisit" : "Recall"}</Label>
              <h2 className="text-h1 font-semibold sm:text-hero">{previousRecap ? "Add to your recap." : "What did you learn?"}</h2>
              <p className="max-w-xl text-xl leading-normal text-muted">
                {previousRecap
                  ? "Your earlier recap is below. Add what you picked up this time; the whole thing gets re-checked."
                  : "From memory, no peeking. We'll compare it with what the video actually said."}
              </p>
            </div>
            <label className="flex flex-col gap-3">
              <span className="text-sm font-semibold">Your recap</span>
              <textarea
                value={recap}
                onChange={(e) => setRecap(e.target.value)}
                rows={10}
                autoFocus
                disabled={busy}
                className="w-full resize-y rounded-panel border border-line bg-white p-6 text-xl leading-normal outline-none transition placeholder:text-muted focus:border-ink disabled:opacity-60"
                placeholder="The video explained that…"
              />
              <span className="text-sm text-muted">
                {words} {words === 1 ? "word" : "words"}
                {words > 0 && words < 30 && ", a few more sentences will give better feedback"}
              </span>
            </label>
            {demo && (
              <p className="rounded-panel bg-sun-soft px-5 py-4 text-sm leading-normal">
                <strong className="font-semibold">Demo mode:</strong> no API key is set, so you&apos;ll get sample feedback. Add
                ANTHROPIC_API_KEY to .env.local for real grading.
              </p>
            )}
            {error && <p role="alert" className="text-bad">{error}</p>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={() => setDone(false)} disabled={busy} className="btn-outline">
                ← Back to video
              </button>
              <button onClick={submit} disabled={busy || recap.trim().length < 20} className="btn disabled:opacity-40">
                {busy && <Spinner />}
                {busy ? "Comparing with the video…" : previousRecap ? "Update and re-check ↗" : "Check my understanding ↗"}
              </button>
            </div>
          </section>

          <aside className="rise flex flex-col gap-6 [--d:120ms]">
            <div className="flex items-center gap-4">
              <Thumb videoId={videoId} className="w-32" />
              <p className="min-w-0 font-semibold line-clamp-2 break-words">{title ?? "Focus session"}</p>
            </div>
            <div className="flex flex-col rounded-hero bg-night p-8 text-night-ink">
              <h3 className="mb-4 text-2xl font-semibold">Stuck? Try answering</h3>
              <ol className="flex flex-col">
                {PROMPTS.map((p, i) => (
                  <li key={p} className="flex gap-4 border-t border-night-2 py-4 leading-normal">
                    <span className="font-semibold text-sun tabular-nums">0{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
            </div>
            {notes.length > 0 && (
              <p className="px-1 text-muted">
                Your {notes.length} {notes.length === 1 ? "note is" : "notes are"} saved with this video.
              </p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
