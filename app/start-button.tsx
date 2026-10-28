"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./ui";

// Submit button that shows a spinner while its form's server action runs.
export default function StartButton({ idle = "Start watching ↗", pending: busy = "Opening…" }: { idle?: string; pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="btn shrink-0"
    >
      {pending && <Spinner />}
      {pending ? busy : idle}
    </button>
  );
}
