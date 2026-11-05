"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/lib/db";
import { type Chapter, fetchSkipSegments, fmtTime } from "@/lib/youtube";
import { Label, Spinner, Thumb } from "../../ui";
import { getChapters, saveNotes } from "./actions";

// Methods only exist once the player is ready, so every call is optional.
type YTPlayer = {
  pauseVideo?(): void;
  playVideo?(): void;
  destroy?(): void;
  getCurrentTime?(): number;
  getDuration?(): number;
  getPlayerState?(): number;
  getVolume?(): number;
  setVolume?(volume: number): void;
  isMuted?(): boolean;
  unMute?(): void;
  getOption?(module: string, option: string): unknown;
  setOption?(module: string, option: string, value: object): void;
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
  start: number | null;
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
  const captions = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scroller = useRef<HTMLDivElement>(null);
  const chapterList = useRef<HTMLOListElement>(null);
  const scrollTop = useRef(0);
  const recenter = useRef<ReturnType<typeof setTimeout>>(undefined);
  const volume = useRef({ v: 100, at: 0 });
  const hudTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();
  const draftKey = `draft:${videoId}`;
  const posKey = `pos:${videoId}`;
  const [done, setDone] = useState(false);
  const [recap, setRecap] = useState(previousRecap ? previousRecap + "\n\n" : "");
  const [notes, setNotes] = useState<Note[]>(previousNotes);
  const [noteText, setNoteText] = useState("");
  const [now, setNow] = useState(start ?? 0);
  const [duration, setDuration] = useState(0);
  const [skips, setSkips] = useState<[number, number][]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  // The side panel shows notes or, like YouTube's chapter panel, the list of chapters.
  const [panel, setPanel] = useState<"notes" | "chapters">("notes");
  const [idle, setIdle] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [full, setFull] = useState(false);
  const [open, setOpen] = useState(false);
  // Slide only after Alt+N, so entering fullscreen hides the panel instantly instead of animating it away.
  const [slide, setSlide] = useState(false);
  const [canFull, setCanFull] = useState(false);
  const [hud, setHud] = useState<string | null>(null);
  const currentChapter = Math.max(0, chapters.findLastIndex((c) => c.t <= now));
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
      let from = start ?? 0;
      try {
        from = start ?? (Number(localStorage.getItem(`pos:${videoId}`)) || 0);
      } catch {}
      yt = player.current = new window.YT.Player(el, {
        videoId,
        width: "100%",
        height: "100%",
        // YouTube's own fullscreen swallows our keys, so we fullscreen our wrapper and slide the notes in on N.
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: from, fs: document.fullscreenEnabled ? 0 : 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data !== window.YT.PlayerState.ENDED) return;
            setDone(true);
            // Finished: next time starts from the top.
            try {
              localStorage.removeItem(`pos:${videoId}`);
            } catch {}
          },
        },
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
    getChapters(videoId).then((c) => live && setChapters(c), () => {});
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
      // Remember the spot while it plays, so coming back later resumes here.
      if (player.current?.getPlayerState?.() === 1)
        try {
          localStorage.setItem(posKey, String(Math.floor(t)));
        } catch {}
      setDuration(player.current?.getDuration?.() ?? 0);
    }, 500);
    return () => clearInterval(tick);
  }, [skips, posKey]);

  // Fullscreen wraps the video and the (hidden until Alt+N) notes panel. A click on the video moves focus into the
  // cross-origin iframe, where our keys can't reach, so we pull focus back.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCanFull(document.fullscreenEnabled);
    const onChange = () => {
      setFull(document.fullscreenElement === stage.current);
      setOpen(false);
      setSlide(false);
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

  // Hide the cursor after 3s still, like on youtube.com, while keeping YouTube's own controls. Our page can't style
  // inside YouTube's iframe, and once the mouse has been over it Chrome keeps the iframe's cursor until the next real
  // move, so a cursor:none layer alone doesn't hide it. Pointer lock does: the browser hides the cursor wherever it is.
  // The first real move or a click releases it and the cursor comes back where it was, over YouTube's
  // controls as before. The clear layer stays as a fallback for when the browser refuses the lock.
  // ponytail: we can't see the mouse moving over YouTube's iframe, so "still" means 3s since the cursor was last
  // shown or YouTube was last clicked; a mouse kept moving for 3s+ blinks out for a moment.
  useEffect(() => {
    if (!full) return;
    let hidden = false;
    let anchor: { x: number; y: number } | null = null; // where the cursor sat when the layer appeared
    let moved = 0; // how far the mouse has moved while locked
    const hide = (v: boolean) => {
      hidden = v;
      anchor = null;
      moved = 0;
      setIdle(v);
      if (v) Promise.resolve(stage.current?.requestPointerLock?.()).catch(() => {});
      else if (document.pointerLockElement) document.exitPointerLock();
    };
    const arm = () => {
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        // Not while paused or with a panel open (it's inert while closed).
        if (player.current?.getPlayerState?.() !== 1 || !input.current?.closest("[inert]")) return arm();
        hide(true);
      }, 3000);
    };
    const onActivity = (e: Event) => {
      if (!hidden) return arm();
      if (e instanceof WheelEvent) return changeVolume(-e.deltaY / 20); // volume, cursor stays hidden
      if (e instanceof MouseEvent && e.type === "mousemove") {
        if (document.pointerLockElement) {
          // Locked, the cursor's position stays put and only the movement is reported.
          moved += Math.abs(e.movementX) + Math.abs(e.movementY);
          if (moved < 4) return;
        } else {
          // Chrome sends a mousemove when the layer appears under a still cursor, so the first move only notes where
          // the cursor is and it takes a real move of a few pixels from there to show it.
          if (!anchor) return void (anchor = { x: e.screenX, y: e.screenY });
          if (Math.hypot(e.screenX - anchor.x, e.screenY - anchor.y) < 4) return;
        }
      }
      hide(false);
      arm();
    };
    // Esc releases the lock (and leaves fullscreen); show the cursor if that happens while hidden.
    const onLockChange = () => {
      if (!document.pointerLockElement && hidden) {
        hide(false);
        arm();
      }
    };
    // A key press restarts the countdown (without showing the cursor), so if Chrome refused a lock for want of a
    // recent click or key press (after Esc, say), the next try lands while this one still counts.
    const onKey = () => {
      if (!hidden) arm();
    };
    const events = ["mousemove", "mousedown", "wheel"] as const;
    events.forEach((t) => document.addEventListener(t, onActivity, true));
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerlockchange", onLockChange);
    window.addEventListener("blur", arm);
    arm();
    centerScroll();
    return () => {
      clearTimeout(hideTimer.current);
      events.forEach((t) => document.removeEventListener(t, onActivity, true));
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("blur", arm);
      if (document.pointerLockElement) document.exitPointerLock();
      setIdle(false);
    };
    // changeVolume only touches refs and state setters, so a stale copy behaves the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  // Alt+N pauses and opens the note box, and closes it again (resuming), even mid-typing. F toggles fullscreen.
  // Space/K, C (captions), the arrows (←/→ seek, ↑/↓ volume) stand in for YouTube's own shortcuts, which lose focus to the page.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      const playing = player.current?.getPlayerState?.() === 1;
      // e.code, not e.key: on a Mac Option+N types a dead key instead of "n".
      if (e.altKey && e.code === "KeyN" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (full ? open && panel === "notes" : document.activeElement === input.current) return closeNote();
        setPanel("notes");
        if (playing) {
          player.current?.pauseVideo?.();
          resume.current = true;
        }
        if (full) {
          setSlide(true);
          setOpen(true);
        }
        else requestAnimationFrame(focusInput); // after the notes view is shown again
        return;
      }
      // Alt+C (Option+C on a Mac) opens and closes the chapter list, like Alt+N for notes. YouTube's own chapter name
      // can't be clicked inside an embed. e.code, not e.key: on a Mac Option+C types "ç".
      if (e.altKey && e.code === "KeyC" && !e.ctrlKey && !e.metaKey && chapters.length > 1) {
        e.preventDefault();
        if (panel === "chapters" && (!full || open)) closeChapters();
        else openChapters();
        return;
      }
      // Previous/next chapter, YouTube's keys: Ctrl+←/→, Option+←/→ on a Mac (Ctrl+arrows switch desktops there).
      const mac = /Mac|iP/.test(navigator.platform);
      const chapterKey = mac ? e.altKey && !e.ctrlKey : e.ctrlKey && !e.altKey;
      if (chapterKey && !e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") && chapters.length > 1) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; // word-jumping while typing
        e.preventDefault();
        jumpChapter(e.key === "ArrowRight" ? 1 : -1);
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
      } else if (k === "c") {
        e.preventDefault();
        toggleCaptions();
      } else if (k === "arrowup" || k === "arrowdown") {
        e.preventDefault();
        changeVolume(k === "arrowup" ? 5 : -5);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // The handlers it calls read only refs, setters and `chapters` (listed), so a stale copy behaves the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, full, open, chapters, panel]);

  // The panel is inert until it opens, so focus it once it has.
  useEffect(() => {
    // preventScroll: otherwise the browser scrolls the still-offscreen panel into view, jolting the video and skipping the slide.
    if (open && panel === "notes") focusInput();
  }, [open, panel]);

  // Opening the chapter list scrolls the playing chapter into view, like YouTube. Only the list scrolls:
  // scrollIntoView would also scroll the page and the fullscreen volume box, which shook the screen.
  useEffect(() => {
    const ol = chapterList.current;
    const li = ol?.querySelector<HTMLElement>("[aria-current]")?.parentElement;
    if (panel === "chapters" && ol && li) ol.scrollTop = li.offsetTop - ol.clientHeight / 2 + li.clientHeight / 2;
  }, [panel, open]);

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

  // Back to a half-written note: the caret goes after the text, not before it (where focus() can leave it).
  function focusInput() {
    const el = input.current;
    el?.focus({ preventScroll: true });
    el?.setSelectionRange(el.value.length, el.value.length);
  }

  // Like YouTube: back goes to the start of the current chapter, or to the previous one if you're within 3s of its start.
  function jumpChapter(dir: 1 | -1) {
    const t = player.current?.getCurrentTime?.() ?? now;
    const i = chapters.findLastIndex((c) => c.t <= t);
    const to = dir === 1 ? chapters[i + 1] : t - (chapters[i]?.t ?? 0) > 3 ? chapters[i] : chapters[i - 1];
    if (!to) return;
    player.current?.seekTo?.(to.t, true);
    flash(to.title);
  }

  function openChapters() {
    setPanel("chapters");
    if (full) {
      setSlide(true);
      setOpen(true);
    }
  }

  function closeChapters() {
    if (full) {
      setOpen(false);
      stage.current?.focus({ preventScroll: true });
    } else setPanel("notes");
  }

  // A short message over the video (volume, chapter), since YouTube's own overlay doesn't show our changes.
  function flash(text: string) {
    setHud(text);
    clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setHud(null), 1200);
  }

  // Click a saved note to fix it: Enter or clicking away keeps the change, Esc drops it. Emptying it keeps the old text.
  function saveEdit(i: number, value: string) {
    setEditing(null);
    const text = value.trim();
    if (text) setNotes((all) => all.map((n, j) => (j === i ? { ...n, text } : n)));
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

  // The player doesn't report whether captions are on (getOption lags), so C tracks it itself. If YouTube started
  // with them on, the first press turns them "on" again and the second turns them off.
  function toggleCaptions() {
    const p = player.current;
    captions.current = !captions.current;
    const list = p?.getOption?.("captions", "tracklist") as { languageCode: string }[] | undefined;
    p?.setOption?.("captions", "track", captions.current ? { languageCode: list?.[0]?.languageCode ?? "en" } : {});
  }

  // The wheel over YouTube's player goes to YouTube, which can't scroll, so the browser hands the scroll on to the
  // nearest scrollable box around it. In fullscreen that's a box around the player with room above and below
  // (the player is sticky, so it never moves): we turn how far it scrolled into volume and recenter it once still.
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const d = e.currentTarget.scrollTop - scrollTop.current;
    scrollTop.current = e.currentTarget.scrollTop;
    // Leaving fullscreen removes the room, which snaps the box back to 0: not a scroll.
    if (!d || !full) return;
    changeVolume(-d / 20);
    clearTimeout(recenter.current);
    recenter.current = setTimeout(centerScroll, 300);
  }

  function centerScroll() {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    scrollTop.current = el.scrollTop;
  }

  // Up/down keys and the mouse wheel in fullscreen. YouTube's getVolume lags behind setVolume, so rapid steps build on our own running value,
  // re-read from the player after a second's pause (in case its slider was used).
  function changeVolume(d: number) {
    const p = player.current;
    if (!p?.setVolume) return;
    const s = volume.current;
    if (Date.now() - s.at > 1000) s.v = p.isMuted?.() ? 0 : (p.getVolume?.() ?? 100);
    s.v = Math.max(0, Math.min(100, s.v + d));
    s.at = Date.now();
    p.setVolume(Math.round(s.v));
    if (s.v > 0) p.unMute?.();
    flash(`Volume ${Math.round(s.v)}%`);
  }

  function toggleFull() {
    if (!document.fullscreenElement) return void stage.current?.requestFullscreen().catch(() => {});
    // Release the cursor ourselves before leaving fullscreen. If the browser releases it (as it does on leaving
    // fullscreen), Chrome refuses to lock it again without a fresh click or key press, so the next fullscreen
    // never hid the cursor. Released by us, it can lock again whenever the mouse goes still.
    if (!document.pointerLockElement) return void document.exitFullscreen().catch(() => {});
    document.addEventListener("pointerlockchange", () => document.exitFullscreen().catch(() => {}), { once: true });
    document.exitPointerLock();
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
              <button onClick={toggleFull} title="Full screen (F). Alt+N pauses and adds a note, Alt+C shows chapters, C toggles captions, ↑/↓ or the mouse wheel change volume." className="rounded-full bg-paper px-4 py-2 text-sm transition-colors hover:bg-line">
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
            <div ref={scroller} onScroll={onScroll} className={`absolute inset-0 ${full ? "overflow-y-scroll [scrollbar-width:none]" : ""}`}>
              <div ref={host} className={full ? "sticky top-0 h-full" : "absolute inset-0"} />
              {full && <div aria-hidden className="h-[200%]" />}
            </div>
            {full && idle && !open && <div aria-hidden className="absolute inset-0 cursor-none" />}
            {hud !== null && (
              <span role="status" className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 rounded-full bg-paper px-4 py-2 text-sm tabular-nums">
                {hud}
              </span>
            )}
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
            <div className={panel === "notes" ? "contents" : "hidden"}>
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
                  {editing === i ? (
                    // Same font, line height and width as the note, and it grows with its text (field-sizing), so
                    // the note stays exactly where it was. The ring sits outside the text without taking space.
                    // ponytail: field-sizing is Chrome/Edge/Safari 26+; Firefox shows a fixed two-line box instead.
                    <textarea
                      autoFocus
                      defaultValue={n.text}
                      maxLength={1000}
                      rows={1}
                      aria-label="Edit note"
                      onFocus={(e) => e.currentTarget.setSelectionRange(n.text.length, n.text.length)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          saveEdit(i, e.currentTarget.value);
                        } else if (e.key === "Escape") setEditing(null);
                      }}
                      onBlur={(e) => saveEdit(i, e.currentTarget.value)}
                      className="min-w-0 flex-1 resize-none rounded-[4px] bg-white p-0 leading-normal break-words ring-1 ring-ink ring-offset-2 outline-none [field-sizing:content]"
                    />
                  ) : (
                    <button onClick={() => setEditing(i)} title="Edit note" className="min-w-0 flex-1 cursor-text text-left leading-normal break-words">
                      {n.text}
                    </button>
                  )}
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
            </div>
            {panel === "chapters" && (
              <>
                <div className="flex items-baseline justify-between border-b border-line px-5 pt-5 pb-4">
                  <h2 className="text-xl font-semibold">Chapters</h2>
                  <button onClick={closeChapters} aria-label="Close chapters" className="text-xl leading-none text-muted transition-colors hover:text-ink">
                    ×
                  </button>
                </div>
                <ol ref={chapterList} className="relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
                  {chapters.map((c, i) => (
                    <li key={c.t}>
                      <button
                        onClick={() => seek(c.t)}
                        aria-current={i === currentChapter || undefined}
                        className={`flex w-full items-center gap-3 rounded-media p-2 text-left transition-colors ${i === currentChapter ? "bg-sun-soft" : "hover:bg-canvas"}`}
                      >
                        {/* Same as Thumb: YouTube already serves these small, next/image would just re-host them. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {c.thumb && <img src={c.thumb} alt="" className="aspect-video w-24 shrink-0 rounded-[6px] bg-line object-cover" />}
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="line-clamp-2 leading-normal break-words">{c.title}</span>
                          <span className="text-sm text-muted tabular-nums">{fmtTime(c.t)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        </div>

        {chapters.length > 1 && (
          // Like the chapter name on youtube.com: shows where you are and opens the chapter list beside the video.
          <div className="rise -mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 [--d:150ms]">
            <button onClick={openChapters} className="flex min-w-0 items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm transition-colors hover:bg-line">
              <span className="shrink-0 text-muted tabular-nums">
                Chapter {currentChapter + 1} of {chapters.length}
              </span>
              <span className="truncate font-semibold">{chapters[currentChapter]?.title}</span>
              <span aria-hidden>›</span>
            </button>
            <span className="text-sm text-muted">Alt+C shows the chapters, Ctrl+← / → jumps between them (Option on Mac)</span>
          </div>
        )}

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
