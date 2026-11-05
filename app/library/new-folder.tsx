"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";
import { Spinner, Thumb } from "../ui";
import { createFolder } from "./actions";
import { ColorChoice } from "./color-wheel";

type Video = {
  id: string;
  videoId: string;
  title: string;
  folder: string | null;
};

// The last tile in the folder grid: name a folder and, if you like, pick videos to put in it.
// Made on a folder's page, it goes inside that folder (`parent`).
export default function NewFolder({ videos, parent }: { videos: Video[]; parent?: string }) {
  const dialog = useId();

  return (
    <>
      <button
        popoverTarget={dialog}
        className="group grid aspect-[4/3] w-full place-items-center rounded-panel border-2 border-dashed border-sky-2 text-muted transition-colors hover:border-link hover:bg-sky/40 hover:text-link"
      >
        <span className="flex flex-col items-center gap-2">
          <span aria-hidden className="text-display leading-none transition-transform duration-300 group-hover:rotate-90">
            +
          </span>
          <span className="font-semibold">New folder</span>
        </span>
      </button>
      <div
        id={dialog}
        popover="auto"
        role="dialog"
        aria-labelledby={`${dialog}-title`}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-hero bg-canvas p-6 text-ink shadow-[0_24px_64px_rgb(26_33_48/0.3)] backdrop:bg-ink/40 sm:p-8"
      >
        <form action={createFolder} onSubmit={() => document.getElementById(dialog)?.hidePopover()} className="flex flex-col gap-6">
          {parent && <input type="hidden" name="parent" value={parent} />}
          <h2 id={`${dialog}-title`} className="text-2xl font-semibold break-words">
            {parent ? `New folder in ${parent}` : "New folder"}
          </h2>
          <input
            name="folder"
            required
            maxLength={40}
            autoFocus
            aria-label="Folder name"
            placeholder="Folder name"
            className="min-h-12 rounded-full border border-line bg-white px-4 outline-none placeholder:text-muted focus:border-ink"
          />
          <ColorChoice />
          {videos.length > 0 && (
            <fieldset className="flex min-h-0 flex-col gap-2">
              <legend className="mb-2 text-sm text-muted">Put videos in it now (optional)</legend>
              <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {videos.map((v) => (
                  <li key={v.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-media p-2 transition-colors hover:bg-paper has-[:checked]:bg-sky">
                      <input type="checkbox" name="ids" value={v.id} className="size-4 shrink-0 accent-ink" />
                      <Thumb videoId={v.videoId} className="w-20" />
                      <span className="flex min-w-0 flex-col">
                        <span className="line-clamp-2 text-sm break-words">{v.title}</span>
                        {v.folder && <span className="truncate text-sm text-muted">In {v.folder}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
          <Actions dialog={dialog} />
        </form>
      </div>
    </>
  );
}

function Actions({ dialog }: { dialog: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" popoverTarget={dialog} popoverTargetAction="hide" className="btn-outline">
        Cancel
      </button>
      <button disabled={pending} className="btn">
        {pending && <Spinner />}
        Create folder
      </button>
    </div>
  );
}
