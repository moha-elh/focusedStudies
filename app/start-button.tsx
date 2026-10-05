"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./ui";

export default function StartButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="flex items-center justify-center gap-2 rounded-control bg-accent px-5 py-3 font-semibold text-canvas transition hover:brightness-110 disabled:opacity-60"
    >
      {pending && <Spinner />}
      {pending ? "Opening…" : "Start watching"}
    </button>
  );
}
