// Small presentational pieces shared by server and client components.

import Link from "next/link";

// [label, page, section on that page]. Section links scroll there without putting a #fragment in the URL.
export const LINKS: [string, string, string?][] = [
  ["Watch", "/"],
  ["Process", "/", "process"],
  ["Library", "/library"],
];

export function scoreOf(feedback: unknown): number | null {
  const s = (feedback as { score?: unknown } | null)?.score;
  return typeof s === "number" ? s : null;
}

// Rounded mean of the graded sessions, or null if none were graded.
export function avgScore(sessions: { feedback: unknown }[]) {
  const scores = sessions.map((s) => scoreOf(s.feedback)).filter((n) => n !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

export function scoreColor(score: number, onDark = false) {
  if (onDark) return score >= 80 ? "text-good-n" : score >= 50 ? "text-mid-n" : "text-bad-n";
  return score >= 80 ? "text-good" : score >= 50 ? "text-mid" : "text-bad";
}

// Wordmark with the registered-style mark, sized by the caller.
export function Mark() {
  return (
    <span className="tracking-tight">
      FocusLearn<sup className="ml-[0.04em] align-super text-[0.3em]">®</sup>
    </span>
  );
}

// Section label with a sun dot, e.g. "• Process".
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 text-sm text-muted ${className}`}>
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-sun" />
      {children}
    </span>
  );
}

export function ScoreRing({ score, size = 112, onDark = false }: { score: number; size?: number; onDark?: boolean }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="5" className={onDark ? "stroke-night-2" : "stroke-line"} />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="5" strokeLinecap="round" stroke="currentColor"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-display font-semibold ${onDark ? "text-night-ink" : ""}`}>{score}</span>
        <span className={`text-xs ${onDark ? "text-night-muted" : "text-muted"}`}>of 100</span>
      </div>
    </div>
  );
}

export function Thumb({ videoId, className = "" }: { videoId: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" className={`aspect-video shrink-0 rounded-media bg-panel object-cover ${className}`} />;
}

export function Spinner() {
  return <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

// "Back to library": a pill with the arrow in its own circle, which slides back a little on hover.
export function BackToLibrary({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/library"
      className={`group inline-flex w-fit items-center gap-3 rounded-full bg-paper py-1.5 pr-5 pl-1.5 text-sm font-semibold shadow-[0_2px_8px_rgb(26_33_48/0.08)] transition-colors duration-200 hover:bg-ink hover:text-paper ${className}`}
    >
      <span aria-hidden className="grid size-8 place-items-center rounded-full bg-canvas text-ink transition-transform duration-200 group-hover:-translate-x-0.5">
        <svg viewBox="0 0 16 16" className="size-4">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      Back to library
    </Link>
  );
}
