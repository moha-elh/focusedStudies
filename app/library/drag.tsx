"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { moveSession } from "./actions";

// Drag a video row onto a folder to move it in, onto the back link to move it up, or onto the tray that appears while
// dragging to send it anywhere (or out of every folder). Native drag and drop: it works with a mouse; on touch screens
// the folder button on each row does the same.
const TYPE = "application/x-focuslearn-video";

// A moved video leaves this list, so its row hides right away instead of waiting for the server. Hidden, not unmounted,
// so the move's form keeps running.
const HideRow = createContext(() => {});
export const useHideRow = () => useContext(HideRow);

export function DragRow({ id, className = "", style, children }: { id: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const [dragging, setDragging] = useState(false);
  const [hidden, setHidden] = useState(false);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TYPE, id);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={(e) => {
        setDragging(false);
        if (e.dataTransfer.dropEffect === "move") setHidden(true); // dropped on a folder
      }}
      className={`${className} ${dragging ? "opacity-40" : ""} ${hidden ? "hidden" : ""}`}
      style={style}
    >
      <HideRow value={() => setHidden(true)}>{children}</HideRow>
    </li>
  );
}

// `folder` is where a dropped video goes; null takes it out of every folder. A dark parent can set --drop-ring and
// --drop-bg so the hover ring still shows on it.
export function DropTarget({ folder, className = "", children }: { folder: string | null; className?: string; children: React.ReactNode }) {
  const [over, setOver] = useState(false);
  const [pending, start] = useTransition();
  const ours = (e: React.DragEvent) => e.dataTransfer.types.includes(TYPE);
  return (
    <div
      onDragOver={(e) => {
        if (!ours(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        if (!ours(e)) return;
        e.preventDefault();
        setOver(false);
        const form = new FormData();
        form.set("folder", folder ?? "");
        const id = e.dataTransfer.getData(TYPE);
        start(() => moveSession(id, form));
      }}
      className={`rounded-panel transition-[box-shadow,opacity] ${over ? "ring-2 ring-(--drop-ring,var(--color-link)) ring-offset-4 ring-offset-(--drop-bg,var(--color-canvas))" : ""} ${pending ? "opacity-60" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// Only there while a video is being dragged: "No folder" and every folder except the one on screen, so a video can go
// anywhere from anywhere, not just into the folders shown or one level up. `folders` is [name, path] pairs.
export function MoveTray({ folders, current }: { folders: [string, string][]; current: string | null }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const start = (e: DragEvent) => setOn(!!e.dataTransfer?.types.includes(TYPE));
    const end = () => setOn(false);
    document.addEventListener("dragstart", start);
    document.addEventListener("dragend", end);
    return () => {
      document.removeEventListener("dragstart", start);
      document.removeEventListener("dragend", end);
    };
  }, []);
  if (!on) return null;
  const pill = "block max-w-64 truncate rounded-full bg-night-2 px-4 py-2 text-sm text-night-ink";
  return (
    // At the top: the browser shows the dragged link's address in the bottom corner, which covered it there.
    // Night blue like the footer, so it stands out from the page; folders light up in sun when a video is over them.
    <div className="fixed inset-x-0 top-0 z-30 bg-night shadow-[0_8px_24px_rgb(20_33_69/0.3)] [--drop-bg:var(--color-night)] [--drop-ring:var(--color-sun)]">
      <div className="wrap flex max-h-48 flex-wrap items-center gap-3 overflow-y-auto py-5">
        <span className="text-sm text-night-muted">Move to</span>
        {current !== null && (
          <DropTarget folder={null} className="rounded-full">
            <span className={`${pill} font-semibold`}>No folder</span>
          </DropTarget>
        )}
        {folders
          .filter(([f]) => f !== current)
          .map(([f, path]) => (
            <DropTarget key={f} folder={f} className="rounded-full">
              <span className={pill}>{path}</span>
            </DropTarget>
          ))}
      </div>
    </div>
  );
}
