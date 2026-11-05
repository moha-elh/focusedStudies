"use client";

import { useId, useRef, useState } from "react";
import { FOLDER_COLORS, type FolderColor, folderStyle, isHex } from "./colors";

const title = (c: string) => c[0].toUpperCase() + c.slice(1);

// The eight presets plus the wheel, as one radio group named "color" (the wheel's own value goes in "custom").
// Used wherever a folder is created; colors.ts' pickedColor() reads the result.
export function ColorChoice() {
  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className="mb-2 text-sm text-muted">Color</legend>
      {(Object.keys(FOLDER_COLORS) as FolderColor[]).map((c, i) => (
        <label key={c} title={title(c)} className="cursor-pointer">
          <input type="radio" name="color" value={c} defaultChecked={i === 0} aria-label={c} className="peer sr-only" />
          <span
            aria-hidden
            style={{ background: FOLDER_COLORS[c][0] }}
            className="block size-7 rounded-full ring-ink ring-offset-2 ring-offset-canvas transition-transform peer-checked:ring-2 peer-focus-visible:outline-2 hover:scale-110"
          />
        </label>
      ))}
      <ColorWheel />
    </fieldset>
  );
}

// The ninth swatch: opens our own picker (the browser's native one doesn't match the site). In ColorChoice it's
// one of the radios; on a folder's page (`action` given) using a color saves it straight away.
export default function ColorWheel({ value, action }: { value?: string | null; action?: (form: FormData) => Promise<void> }) {
  const id = useId();
  const [picked, setPicked] = useState(isHex(value) ? value : null);
  // On a folder's page the saved color changes under us (a preset was clicked, or the save landed): follow it,
  // so the wheel's center doesn't keep showing an old custom color.
  const [saved, setSaved] = useState(value);
  if (value !== saved) {
    setSaved(value);
    setPicked(isHex(value) ? value : null);
  }
  const [hsl, setHsl] = useState(() => toHsl(picked ?? "#3a9be6"));
  const [typed, setTyped] = useState<string | null>(null); // the hex field while it's being edited
  const radio = useRef<HTMLInputElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const hex = toHex(...hsl);
  const anchor = `--wheel${id.replace(/\W/g, "")}`; // useId's characters aren't valid in a CSS name

  function use() {
    setPicked(hex);
    if (hidden.current) hidden.current.value = hex;
    document.getElementById(id)?.hidePopover();
    if (action) hidden.current?.form?.requestSubmit();
    else if (radio.current) radio.current.checked = true;
  }

  const slider = (label: string, i: 0 | 1 | 2, min: number, max: number, track: string) => (
    <label className="flex flex-col gap-2 text-sm">
      <span className="flex justify-between text-muted">
        {label}
        <span className="tabular-nums">{hsl[i]}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={hsl[i]}
        onChange={(e) => {
          const next = [...hsl] as [number, number, number];
          next[i] = Number(e.target.value);
          setHsl(next);
          setTyped(null);
        }}
        className="color-range"
        style={{ background: track }}
      />
    </label>
  );

  const [h, s, l] = hsl;
  const ui = (
    <>
      <input ref={hidden} type="hidden" name="custom" defaultValue={picked ?? ""} />
      {!action && <input ref={radio} type="radio" name="color" value="custom" aria-label="Custom color" className="peer sr-only" />}
      <button
        type="button"
        popoverTarget={id}
        title="Pick any color"
        aria-label="Pick any color"
        aria-pressed={!!action && !!picked && picked === value}
        style={{ anchorName: anchor } as React.CSSProperties}
        className="block size-7 rounded-full bg-[conic-gradient(#3a9be6,#9b6ee0,#e46aa8,#e2564b,#ef8a2e,#e8b923,#4fb35a,#8b8f96,#3a9be6)] ring-ink ring-offset-2 ring-offset-canvas transition-transform peer-checked:ring-2 hover:scale-110 aria-pressed:ring-2"
      />
      <div
        id={id}
        popover="auto"
        aria-label="Pick a folder color"
        style={{ positionAnchor: anchor } as React.CSSProperties}
        className="color-pop m-auto w-[min(320px,calc(100vw-32px))] rounded-panel bg-canvas p-5 text-ink shadow-[0_24px_64px_rgb(26_33_48/0.3)]"
      >
        <div className="flex flex-col gap-5">
          {/* The color as a folder, so you see what you're making rather than a flat swatch. */}
          <div className="flex items-center gap-4">
            <span aria-hidden className="relative block h-12 w-16 shrink-0" style={folderStyle(hex)}>
              <span className="absolute top-0 left-0 h-3 w-7 rounded-t-[6px] bg-(--back)" />
              <span className="absolute inset-x-0 top-1.5 bottom-0 rounded-[8px] rounded-tl-none bg-linear-to-b from-(--back) to-(--back-2)" />
              <span className="absolute inset-x-0 bottom-0 h-[62%] rounded-[8px] bg-linear-to-b from-(--front) to-(--front-2)" />
            </span>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted">
              Hex
              <input
                value={typed ?? hex}
                maxLength={7}
                spellCheck={false}
                onChange={(e) => {
                  const v = e.target.value.trim().toLowerCase();
                  setTyped(v);
                  if (isHex(v)) setHsl(toHsl(v));
                }}
                onBlur={() => setTyped(null)}
                className="min-h-10 rounded-full border border-line bg-white px-4 text-base text-ink uppercase tabular-nums outline-none focus:border-ink"
              />
            </label>
          </div>
          {slider("Hue", 0, 0, 360, `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360].map((x) => toHex(x, s, l)).join(",")})`)}
          {slider("Strength", 1, 10, 90, `linear-gradient(90deg, ${toHex(h, 10, l)}, ${toHex(h, 90, l)})`)}
          {slider("Shade", 2, 30, 70, `linear-gradient(90deg, ${toHex(h, s, 30)}, ${toHex(h, s, 70)})`)}
          <div className="flex justify-end gap-2">
            <button type="button" popoverTarget={id} popoverTargetAction="hide" className="btn-outline min-h-10 px-4 text-sm">
              Cancel
            </button>
            <button type="button" onClick={use} className="btn min-h-10 px-4 text-sm">
              Use color
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return action ? (
    <form action={action}>
      <input type="hidden" name="color" value="custom" />
      {ui}
    </form>
  ) : (
    <span className="contents">{ui}</span>
  );
}

// HSL (degrees, %, %) ↔ #rrggbb. Hue is the slider people understand; hex is what's stored.
function toHex(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
  return [clamp(h * 60, 0, 360), clamp(s * 100, 10, 90), clamp(l * 100, 30, 70)];
}
