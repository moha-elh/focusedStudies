"use client";

import { useEffect, useRef, useState } from "react";

// The ninth swatch: a color wheel that opens the browser's own color picker. In the new-folder form it's one of the
// color radios; on a folder's page (`action` given) choosing a color saves it straight away.
export default function ColorWheel({ value, action }: { value?: string | null; action?: (form: FormData) => Promise<void> }) {
  const [picked, setPicked] = useState(value?.startsWith("#") ? value : null);
  const radio = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // "change" fires once the picker closes; React's onChange fires on every drag, which would save dozens of times.
  useEffect(() => {
    const el = input.current;
    const onChange = () => (action ? el?.form?.requestSubmit() : radio.current && (radio.current.checked = true));
    el?.addEventListener("change", onChange);
    return () => el?.removeEventListener("change", onChange);
  }, [action]);

  const wheel = (
    <label title="Pick any color" className="relative cursor-pointer">
      <input
        ref={input}
        type="color"
        name="custom"
        defaultValue={picked ?? "#3a9be6"}
        onInput={(e) => setPicked(e.currentTarget.value)}
        aria-label="Pick any color"
        className="peer absolute inset-0 size-full cursor-pointer opacity-0"
      />
      {!action && <input ref={radio} type="radio" name="color" value="custom" aria-label="Custom color" className="peer sr-only" />}
      <span
        aria-hidden
        aria-pressed={!!action && !!picked && picked === value}
        className="grid size-7 place-items-center rounded-full bg-[conic-gradient(#e2564b,#ef8a2e,#e8b923,#4fb35a,#3a9be6,#9b6ee0,#e46aa8,#e2564b)] ring-ink ring-offset-2 ring-offset-canvas transition-transform peer-checked:ring-2 peer-focus-visible:outline-2 hover:scale-110 aria-pressed:ring-2"
      >
        {picked && <span className="size-3 rounded-full ring-2 ring-white" style={{ background: picked }} />}
      </span>
    </label>
  );

  return action ? (
    <form action={action}>
      <input type="hidden" name="color" value="custom" />
      {wheel}
    </form>
  ) : (
    wheel
  );
}
