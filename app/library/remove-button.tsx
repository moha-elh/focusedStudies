"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "../ui";
import { removeSession } from "./actions";

// The × opens a small confirm dialog (native popover: Esc or a click outside cancels) naming the video, since its
// notes, recap and feedback go with it. The unsent draft and resume spot for the video go too, so reopening starts fresh.
export default function RemoveButton({ id, videoId, title, className }: { id: string; videoId: string; title: string; className?: string }) {
  const dialog = useId();

  return (
    <>
      <button popoverTarget={dialog} aria-label="Remove from library" title="Remove from library" className={className}>
        <svg viewBox="0 0 24 24" aria-hidden className="size-5">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div
        id={dialog}
        popover="auto"
        role="alertdialog"
        aria-labelledby={`${dialog}-title`}
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-hero bg-canvas p-6 text-ink shadow-[0_24px_64px_rgb(26_33_48/0.3)] backdrop:bg-ink/40 sm:p-8"
      >
        <form
          action={removeSession.bind(null, id)}
          onSubmit={() => {
            try {
              localStorage.removeItem(`draft:${videoId}`);
              localStorage.removeItem(`pos:${videoId}`);
            } catch {}
          }}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <h2 id={`${dialog}-title`} className="text-2xl font-semibold">Remove from library?</h2>
            <p className="leading-normal text-muted">
              <span className="font-semibold break-words text-ink">{title}</span> and its notes, recap and feedback will be
              deleted. This can&apos;t be undone.
            </p>
          </div>
          <Actions dialog={dialog} />
        </form>
      </div>
    </>
  );
}

// Its own component so useFormStatus can see the form's pending state.
function Actions({ dialog }: { dialog: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" popoverTarget={dialog} popoverTargetAction="hide" disabled={pending} className="btn-outline">
        Cancel
      </button>
      <button
        autoFocus
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-bad px-6 font-semibold whitespace-nowrap text-paper transition-colors hover:bg-bad/90 disabled:opacity-60"
      >
        {pending && <Spinner />}
        {pending ? "Removing…" : "Remove"}
      </button>
    </div>
  );
}
