"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./ui";

export default function StartButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="btn shrink-0"
    >
      {pending && <Spinner />}
      {pending ? "Opening…" : "Start watching ↗"}
    </button>
  );
}
