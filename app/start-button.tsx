"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./ui";

export default function StartButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-60"
    >
      {pending && <Spinner />}
      {pending ? "Opening…" : "Start watching ↗"}
    </button>
  );
}
