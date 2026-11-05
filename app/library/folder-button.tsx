"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "../ui";
import { moveSession } from "./actions";
import { ColorChoice } from "./color-wheel";

// Files a video into a folder: pick an existing one, type a new name, or take it out. Same native popover as RemoveButton.
// `folders` is [name, path] pairs; the path ("Courses / Python") tells nested folders apart.
export default function FolderButton({ id, folder, folders, className }: { id: string; folder: string | null; folders: [string, string][]; className?: string }) {
  const dialog = useId();
  const action = moveSession.bind(null, id);
  const close = () => document.getElementById(dialog)?.hidePopover();

  return (
    <>
      <button popoverTarget={dialog} aria-label="Move to folder" title="Move to folder" className={className}>
        <svg viewBox="0 0 24 24" aria-hidden className="size-5">
          <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h9A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        id={dialog}
        popover="auto"
        role="dialog"
        aria-labelledby={`${dialog}-title`}
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-hero bg-canvas p-6 text-ink shadow-[0_24px_64px_rgb(26_33_48/0.3)] backdrop:bg-ink/40 sm:p-8"
      >
        <div className="flex flex-col gap-6">
          <h2 id={`${dialog}-title`} className="text-2xl font-semibold">Move to folder</h2>
          {folders.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {folders.map(([f, path]) => (
                <li key={f} className="max-w-full">
                  <form action={action} onSubmit={close}>
                    <input type="hidden" name="folder" value={f} />
                    <button
                      disabled={f === folder}
                      className="max-w-full truncate rounded-full bg-paper px-4 py-2 text-sm transition-colors hover:bg-line disabled:bg-ink disabled:text-paper"
                    >
                      {path}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={action} onSubmit={close} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <input
                name="folder"
                required
                maxLength={40}
                aria-label="New folder"
                placeholder="New folder"
                className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-white px-4 outline-none placeholder:text-muted focus:border-ink"
              />
              <Submit />
            </div>
            <ColorChoice />
          </form>
          {folder && (
            <form action={action} onSubmit={close}>
              <button className="text-sm text-muted transition-colors hover:text-ink">Take out of “{folder}”</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn">
      {pending && <Spinner />}
      Move
    </button>
  );
}
