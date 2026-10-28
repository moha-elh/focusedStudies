"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { Spinner } from "./ui";

type State = "sent" | "error" | null;

// Floating "Feedback" button on every page; the note is saved to Supabase (feedback table) with the page it came from.
export default function Feedback({ action }: { action: (prev: State, form: FormData) => Promise<State> }) {
  const [state, formAction, pending] = useActionState(action, null);
  const path = usePathname();

  return (
    <>
      <button
        popoverTarget="feedback"
        className="fixed right-4 bottom-4 z-20 rounded-full bg-night px-4 py-2.5 text-sm font-semibold text-night-ink shadow-[0_8px_24px_rgb(26_33_48/0.25)] transition-colors hover:bg-night-2"
      >
        Feedback
      </button>
      <div
        id="feedback"
        popover="auto"
        aria-label="Send feedback"
        className="fixed inset-auto right-4 bottom-18 m-0 w-[min(380px,calc(100vw-32px))] rounded-panel bg-paper p-5 text-ink shadow-[0_24px_64px_rgb(26_33_48/0.3)]"
      >
        {state === "sent" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xl font-semibold">Thank you!</p>
            <p className="leading-normal text-muted">Every note is read. It really helps shape what FocusLearn becomes.</p>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-xl font-semibold">What&apos;s working? What isn&apos;t?</span>
              <textarea
                name="message"
                required
                maxLength={2000}
                rows={4}
                placeholder="Anything helps: a bug, a confusing screen, an idea…"
                className="w-full resize-y rounded-media border border-line bg-white p-3 leading-normal outline-none placeholder:text-muted focus:border-ink"
              />
            </label>
            <input type="hidden" name="page" value={path} />
            {state === "error" && <p role="alert" className="text-sm text-bad">Couldn&apos;t send that. Please try again.</p>}
            <button disabled={pending} className="btn self-start">
              {pending && <Spinner />}
              {pending ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
