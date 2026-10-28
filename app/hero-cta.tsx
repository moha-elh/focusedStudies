"use client";

import { useState } from "react";
import StartButton from "./start-button";

// Organic starburst: a circle with 12 soft lobes plus a slight wobble so it doesn't look stamped.
const BURST =
  Array.from({ length: 145 }, (_, i) => {
    const t = (i / 144) * 2 * Math.PI;
    const r = 44 + 3.2 * Math.sin(12 * t) + 0.8 * Math.sin(5 * t + 1);
    return `${i ? "L" : "M"}${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`;
  }).join(" ") + "Z";

// Petals thrown out on click, in the meadow's colors.
const PETALS = Array.from({ length: 10 }, (_, i) => ({
  "--a": `${i * 36 + 8}deg`,
  "--c": ["var(--color-sun)", "var(--color-sun-soft)", "var(--color-paper)"][i % 3],
})) as React.CSSProperties[];

// The starburst + play triangle, shared by the hero CTA and the nav button.
export function Burst({ icon }: { icon: string }) {
  // `icon` sizes the triangle and nudges it sideways for optical centering.
  return (
    <>
      <svg viewBox="0 0 100 100" aria-hidden className="burst-shape absolute inset-0 size-full">
        <path d={BURST} />
      </svg>
      <svg viewBox="0 0 24 24" aria-hidden className={`relative fill-ink ${icon}`}>
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
      </svg>
    </>
  );
}

export default function HeroCta({ action, defaultOpen }: { action: (f: FormData) => Promise<void>; defaultOpen: boolean }) {
  const [phase, setPhase] = useState<"idle" | "opening" | "open">(defaultOpen ? "open" : "idle");

  function play() {
    setPhase("opening");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => setPhase("open"), reduce ? 0 : 520);
  }

  return (
    <div className="flex min-h-36 w-full items-center justify-center">
      {phase === "open" ? (
        <form action={action} className="rise flex w-full flex-wrap gap-1.5 rounded-[32px] bg-paper p-1.5 focus-within:shadow-[0_0_0_2px_var(--color-link)]">
          <input
            name="url"
            required
            autoFocus
            aria-label="YouTube link"
            placeholder="Paste a YouTube link…"
            className="min-h-12 min-w-0 flex-[1_1_220px] rounded-full bg-transparent px-5 outline-none placeholder:text-[#7a7c76]"
          />
          <StartButton />
        </form>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <button
              id="hero-play"
              type="button"
              onClick={play}
              disabled={phase === "opening"}
              aria-label="Start watching: paste a YouTube link"
              className={`burst relative grid size-20 place-items-center sm:size-24 ${phase === "opening" ? "burst-go" : ""}`}
            >
              <Burst icon="size-7 -translate-x-[2%] sm:size-8" />
            </button>
            {phase === "opening" && (
              <>
                <span aria-hidden className="ripple" />
                <span aria-hidden className="ripple [animation-delay:120ms]" />
                {PETALS.map((style, i) => <span key={i} aria-hidden className="petal" style={style} />)}
              </>
            )}
          </div>
          <span className="text-sm text-ink">Press play to begin</span>
        </div>
      )}
    </div>
  );
}
