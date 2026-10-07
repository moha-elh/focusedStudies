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
    });
    const json = await res.json().catch(() => ({ error: "Something went wrong." }));
    if (res.ok) {
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
    <main className="flex flex-col gap-6">
      {/* Kept mounted while recapping so "Back to video" resumes where you left off. */}
      <div className={done ? "hidden" : "flex flex-col gap-6"}>
        <div className="flex flex-col gap-3 px-2 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <h1 className="min-w-0 text-2xl font-medium line-clamp-2 sm:text-display">{title ?? "Focus session"}</h1>
          <Label className="shrink-0">
            {skipped ? `Skipped ${skipped} sponsor ${skipped === 1 ? "segment" : "segments"}` : skips.length ? "Focus mode, sponsors skipped" : "Focus mode"}
          </Label>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
          <div className="aspect-video w-full overflow-hidden rounded-hero bg-panel">
            <div ref={host} />
          </div>

          <section className="flex max-h-[28rem] min-h-64 flex-col rounded-hero bg-paper p-3 lg:max-h-none">
            <div className="flex items-baseline justify-between px-3 pt-2 pb-3">
              <h2 className="font-medium">Notes</h2>
              <span className="text-xs text-muted">{notes.length ? `${notes.length} saved` : "Stamped with the video time"}</span>
            </div>
            <ol className="flex flex-1 flex-col overflow-y-auto">
              {notes.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">
                  Jot down anything worth keeping. Each note remembers its moment, so you can jump back to it later.
                </li>
              )}
              {notes.map((n, i) => (
                <li key={`${n.t}-${i}`} className="group flex items-start gap-3 rounded-media px-3 py-2 hover:bg-canvas">
                  <button
                    onClick={() => seek(n.t)}
                    title="Jump to this moment"
                    className="shrink-0 text-sm font-medium tabular-nums underline-offset-4 hover:underline"
                  >
                    {fmtTime(n.t)}
                  </button>
                  <p className="min-w-0 flex-1 text-sm break-words">{n.text}</p>
                  <button
                    onClick={() => setNotes((all) => all.filter((_, j) => j !== i))}
                    aria-label="Delete note"
                    className="text-sm text-muted opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            <form onSubmit={addNote} className="mt-3 flex items-center gap-2 rounded-full bg-canvas p-1 pl-4">
              <span className="text-sm text-muted tabular-nums">{fmtTime(now)}</span>
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                maxLength={1000}
                aria-label="New note"
                placeholder="Add a note…"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted"
              />
              <button
                disabled={!noteText.trim()}
                className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity disabled:opacity-30"
              >
                Add
              </button>
            </form>
          </section>
        </div>

        <div className="flex flex-col justify-between gap-4 px-2 sm:flex-row sm:items-center">
          <p className="max-w-md text-sm text-muted">
            {previousRecap
              ? "You've watched this before. When it ends, add to your recap and it'll be re-checked."
              : "When the video ends, you'll explain what you learned in your own words."}
          </p>
          <button
            onClick={finish}
            className="self-start rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-85 sm:self-auto"
          >
            I&apos;m done watching ↗
          </button>
        </div>
      </div>

      {done && (
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <section className="flex min-w-0 flex-col gap-6 rounded-hero bg-paper p-6 sm:p-10">
            <div className="flex flex-col gap-3">
              <Label>{previousRecap ? "Revisit" : "Recall"}</Label>
              <h2 className="text-display font-medium sm:text-h1">{previousRecap ? "Add to your recap." : "What did you learn?"}</h2>
              <p className="max-w-xl text-muted">
                {previousRecap
                  ? "Your earlier recap is below. Add what you picked up this time; the whole thing gets re-checked."
                  : "From memory, no peeking. We'll compare it with what the video actually said."}
              </p>
            </div>
            <textarea
              value={recap}
              onChange={(e) => setRecap(e.target.value)}
              rows={12}
              autoFocus
              disabled={busy}
              className="w-full resize-y rounded-panel bg-canvas p-5 leading-relaxed outline-none transition placeholder:text-muted focus:ring-2 focus:ring-ink/20 disabled:opacity-60"
              placeholder="The video explained that…"
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <span className="text-sm text-muted sm:mr-auto">
                {words} {words === 1 ? "word" : "words"}
                {words > 0 && words < 30 && ", a few more sentences will give better feedback"}
              </span>
              <button onClick={() => setDone(false)} disabled={busy} className="px-3 py-2 text-sm transition-colors hover:text-muted">
                Back to video
              </button>
              <button
                onClick={submit}
                disabled={busy || recap.trim().length < 20}
                className="flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
              >
                {busy && <Spinner />}
                {busy ? "Comparing with the video…" : previousRecap ? "Update and re-check ↗" : "Check my understanding ↗"}
              </button>
            </div>
            {error && <p className="text-sm text-bad">{error}</p>}
            {demo && (
              <p className="text-sm text-muted">
                Demo mode: no API key is set, so you&apos;ll get sample feedback. Add ANTHROPIC_API_KEY to .env.local
                for real grading.
              </p>
            )}
          </section>

          <aside className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 rounded-hero bg-paper p-3">
              <Thumb videoId={videoId} className="w-full" />
              <p className="px-2 pb-2 text-sm text-muted line-clamp-2">{title}</p>
            </div>
            <div className="flex flex-1 flex-col gap-4 rounded-hero bg-night p-6 text-night-ink">
              <span className="text-xs text-night-ink/60">[ Stuck? Try answering ]</span>
              <ol className="flex flex-col gap-3">
                {PROMPTS.map((p, i) => (
                  <li key={p} className="flex gap-3 border-t border-night-ink/15 pt-3 text-sm">
                    <span className="text-night-ink/50">0{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
              {notes.length > 0 && (
                <p className="mt-auto border-t border-night-ink/15 pt-3 text-sm text-night-ink/60">
                  Your {notes.length} {notes.length === 1 ? "note is" : "notes are"} saved with this video.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
