// Small presentational pieces shared by server and client components.

export function scoreOf(feedback: unknown): number | null {
  const s = (feedback as { score?: unknown } | null)?.score;
  return typeof s === "number" ? s : null;
}

export function scoreColor(score: number) {
  return score >= 80 ? "text-good" : score >= 50 ? "text-mid" : "text-bad";
}

// Wordmark with the registered-style mark, sized by the caller.
export function Mark({ className = "" }: { className?: string }) {
  return (
    <span className={`tracking-tight ${className}`}>
      FocusLearn<sup className="ml-[0.04em] align-super text-[0.3em]">®</sup>
    </span>
  );
}

// Bracketed section label, e.g. "[ Process ]".
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-xs text-muted ${className}`}>[ {children} ]</span>;
}

export function ScoreRing({ score, size = 112, onDark = false }: { score: number; size?: number; onDark?: boolean }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="5" className={onDark ? "stroke-night-ink/15" : "stroke-line"} />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="5" strokeLinecap="round" stroke="currentColor"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-display font-medium">{score}</span>
        <span className={`text-xs ${onDark ? "text-night-ink/60" : "text-muted"}`}>of 100</span>
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
