"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "../../ui";

// Its own component so useFormStatus can see the form's pending state.
export default function RegradeButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn shrink-0">
      {pending && <Spinner />}
      {pending ? "Grading…" : "Grade again"}
    </button>
  );
}
