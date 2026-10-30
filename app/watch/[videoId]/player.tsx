"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/lib/db";
import { fetchSkipSegments, fmtTime } from "@/lib/youtube";
import { Label, Spinner, Thumb } from "../../ui";
import { saveNotes } from "./actions";

// Methods only exist once the player is ready, so every call is optional.
type YTPlayer = {
  pauseVideo?(): void;
  playVideo?(): void;
  destroy?(): void;
  getCurrentTime?(): number;
  getDuration?(): number;
  getPlayerState?(): number;
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
  const list = useRef<HTMLOListElement>(null);
  const added = useRef<number>(null);
  const stage = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const resume = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const mouse = useRef({ x: -1, y: -1 });
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
  const [full, setFull] = useState(false);
  const [open, setOpen] = useState(false);
  // Slide only after Alt+N, so entering fullscreen hides the panel instantly instead of animating it away.
  const [slide, setSlide] = useState(false);
  const [idle, setIdle] = useState(false);
  const [controls, setControls] = useState(false);
  const [canFull, setCanFull] = useState(false);
  const words = recap.trim() ? recap.trim().split(/\s+/).length : 0;

  // YouTube replaces the element it's given with an iframe, so hand it a fresh child each time
  // (React re-runs this effect in dev and on a new ?t=) and destroy the old player on cleanup.
  useEffect(() => {
    const box = host.current!;
    const el = box.appendChild(document.createElement("div"));
    let live = true;
    let yt: YTPlayer | null = null;
    const create = () => {
      if (!live) return;
      yt = player.current = new window.YT.Player(el, {
        videoId,
        width: "100%",
        height: "100%",
        // YouTube's own fullscreen swallows our keys, so we fullscreen our wrapper and slide the notes in on N.
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start, fs: document.fullscreenEnabled ? 0 : 1 },
        events: { onStateChange: (e: { data: number }) => e.data === window.YT.PlayerState.ENDED && setDone(true) },
      });
    };
    if (window.YT?.Player) create();
    else {
      window.onYouTubeIframeAPIReady = create;
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
    }
    return () => {
      live = false;
      yt?.destroy?.();
      if (player.current === yt) player.current = null;
      box.replaceChildren();
    };
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

  // Fullscreen wraps the video and the (hidden until Alt+N) notes panel. A click on the video moves focus into the
  // cross-origin iframe, where our keys can't reach, so we pull focus back.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCanFull(document.fullscreenEnabled);
    const onChange = () => {
      setFull(document.fullscreenElement === stage.current);
      setOpen(false);
      setSlide(false);
      setControls(false);
      if (document.fullscreenElement) wake();
      else {
        clearInterval(idleTimer.current);
        setIdle(false);
      }
    };
    const onBlur = () =>
      setTimeout(() => {
        if (document.activeElement?.tagName === "IFRAME") stage.current?.focus({ preventScroll: true });
      });
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Alt+N pauses and opens the note box, and closes it again (resuming), even mid-typing. F toggles fullscreen.
  // Space/K and the arrows stand in for YouTube's own shortcuts, which lose focus to the page.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      const playing = player.current?.getPlayerState?.() === 1;
      // e.code, not e.key: on a Mac Option+N types a dead key instead of "n".
      if (e.altKey && e.code === "KeyN" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (full ? open : document.activeElement === input.current) return closeNote();
        if (playing) {
          player.current?.pauseVideo?.();
          resume.current = true;
        }
        if (full) {
          setSlide(true);
          setOpen(true);
        }
        else input.current?.focus({ preventScroll: true });
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      const t = player.current?.getCurrentTime?.() ?? 0;
      if (k === "f" && document.fullscreenEnabled) {
        e.preventDefault();
        toggleFull();
      } else if (k === "k" || (k === " " && !(e.target instanceof HTMLButtonElement))) {
        e.preventDefault();
        togglePlay();
      } else if (k === "arrowleft" || k === "arrowright") {
        e.preventDefault();
        player.current?.seekTo?.(Math.max(0, t + (k === "arrowleft" ? -5 : 5)), true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [done, full, open]);

  // The panel is inert until it opens, so focus it once it has.
  useEffect(() => {
    // preventScroll: otherwise the browser scrolls the still-offscreen panel into view, jolting the video and skipping the slide.
    if (open) input.current?.focus({ preventScroll: true });
  }, [open]);

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

  // Opening a video adds it to the library, and every note is saved as you go (the draft above is the offline backup).
  useEffect(() => {
    if (draftLoaded) saveNotes(videoId, title, notes).catch(() => {});
  }, [videoId, title, draftLoaded, notes]);

  // Keep a newly added note in view inside the fixed-height list.
  useEffect(() => {
    if (added.current === null) return;
    list.current?.querySelector(`[data-t="${added.current}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    added.current = null;
  }, [notes]);

  function addNote(e: React.FormEvent) {
    e.preventDefault();
    const text = noteText.trim();
    if (text) {
      const t = Math.floor(player.current?.getCurrentTime?.() ?? now);
      added.current = t;
      setNotes((all) => [...all, { t, text }].sort((a, b) => a.t - b.t));
      setNoteText("");
    }
    // Opened with Alt+N (or in fullscreen): Enter also closes and resumes. Typed in normally: keep the cursor for the next note.
    if (full || resume.current) closeNote();
  }

  // Alt+N again or Enter: hide the panel and, if Alt+N paused the video, pick up where you left off.
  function closeNote() {
    setOpen(false);
    stage.current?.focus({ preventScroll: true });
    if (resume.current) player.current?.playVideo?.();
    resume.current = false;
  }

  function togglePlay() {
    if (player.current?.getPlayerState?.() === 1) player.current.pauseVideo?.();
    else player.current?.playVideo?.();
  }

  // Chrome never applies a cursor change from inside the cross-origin YouTube iframe (tested: YouTube's own
  // cursor:none leaves the Windows arrow showing), so only our page can hide it, and only from an element already
  // under the mouse. In fullscreen a cover sits over the picture (not YouTube's control strip), sees every move,
  // and hides the cursor after 3s still. The trade-off: YouTube's bar shows only when the mouse reaches the strip.
  function onCoverMove(e: React.MouseEvent) {
    // Browsers also fire mousemove when the cursor style flips, with the mouse standing still; only a new position counts.
    if (e.clientX === mouse.current.x && e.clientY === mouse.current.y) return;
    mouse.current = { x: e.clientX, y: e.clientY };
    setControls(false);
    wake();
  }

  function wake() {
    setIdle(false);
    clearInterval(idleTimer.current);
    idleTimer.current = setInterval(() => {
      if (player.current?.getPlayerState?.() !== 1) return;
      setIdle(true);
      clearInterval(idleTimer.current);
    }, 3000);
  }

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else stage.current?.requestFullscreen().catch(() => {});
  }

  function seek(t: number) {
    player.current?.seekTo?.(t, true);
    player.current?.playVideo?.();
  }

  function finish() {
    player.current?.pauseVideo?.();
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
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start lg:self-auto">
            <span className="inline-flex items-center gap-2.5 rounded-full bg-paper px-4 py-2 text-sm">
              <span aria-hidden className="size-2 rounded-full bg-sun" />
              {skipped ? `Skipped ${skipped} sponsor ${skipped === 1 ? "segment" : "segments"}` : skips.length ? "Focus mode, sponsors skipped" : "Focus mode"}
            </span>
            {canFull && (
              <button onClick={toggleFull} title="Full screen (F). Alt+N pauses and adds a note." className="rounded-full bg-paper px-4 py-2 text-sm transition-colors hover:bg-line">
                Full screen
              </button>
            )}
          </div>
        </div>

        <div
          ref={stage}
          tabIndex={-1}
          className={`rise outline-none [--d:100ms] ${full ? "relative h-dvh overflow-hidden bg-black" : "grid gap-6 lg:grid-cols-[1fr_340px]"}`}
        >
          <div className={`relative w-full overflow-hidden ${full ? "h-full" : "aspect-video rounded-hero bg-panel"}`}>
            <div ref={host} className="absolute inset-0" />
            {full &&
              // Two tiles over the picture. Only the right one gives way (to the top half) while the mouse is in the
              // control strip, since YouTube's settings menu opens up from the bottom right.
              // Click plays/pauses and double-click leaves fullscreen, like on YouTube.
              [
                ["l", "left-0 right-100 bottom-32"],
                ["r", `right-0 w-100 ${controls ? "bottom-1/2" : "bottom-32"}`],
              ].map(([key, pos]) => (
                <div
                  key={key}
                  aria-hidden
                  onMouseMove={onCoverMove}
                  onMouseLeave={(e) => e.clientY >= e.currentTarget.getBoundingClientRect().bottom - 1 && setControls(true)}
                  onClick={togglePlay}
                  onDoubleClick={toggleFull}
                  className={`absolute top-0 ${pos} ${idle ? "cursor-none" : ""}`}
                />
              ))}
            {/* Watch progress, in the sun color, along the bottom edge. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-ink/20">
              <div className="h-full bg-sun transition-[width] duration-500 ease-linear" style={{ width: `${duration ? Math.min(100, (now / duration) * 100) : 0}%` }} />
            </div>
          </div>

          {/* Fixed height: on desktop h-0 + min-h-full takes the video's height without ever stretching the row.
              In fullscreen it sits off the right edge and slides in on N. */}
          <section
            inert={full && !open}
            className={`flex flex-col overflow-hidden rounded-hero bg-paper ${
              full
                ? `absolute inset-y-4 right-4 w-[min(340px,calc(100%-2rem))] ${slide ? "transition-transform duration-300 ease-out" : ""} ${open ? "" : "translate-x-[calc(100%+2rem)]"}`
                : "h-80 lg:h-0 lg:min-h-full"
            }`}
          >
            <div className="flex items-baseline justify-between border-b border-line px-5 pt-5 pb-4">
              <h2 className="text-xl font-semibold">Notes</h2>
              <span className="text-sm text-muted">{notes.length ? `${notes.length} saved` : "Stamped with the video time"}</span>
            </div>
            <ol ref={list} className="notes-fade flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
              {notes.length === 0 && (
                <li className="px-2 py-2 leading-normal text-muted">
                  Jot down anything worth keeping. Each note remembers its moment, so you can jump back to it later.
                </li>
              )}
              {notes.map((n, i) => (
                <li key={`${n.t}-${i}`} data-t={n.t} className="group flex items-start gap-3 rounded-media p-2 transition-colors hover:bg-canvas">
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
                ref={input}
                onChange={(e) => setNoteText(e.target.value)}
                maxLength={1000}
                aria-label="New note"
                placeholder="Add a note… (Alt+N)"
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
                GROQ_API_KEY (or ANTHROPIC_API_KEY) to .env.local for real grading.
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
