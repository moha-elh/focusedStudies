"use client";

import { useState, useTransition } from "react";
import { moveSession } from "./actions";

// Drag a video row onto a folder to move it in, or onto the back link to move it up and out. Native drag and drop:
// it works with a mouse; on touch screens the folder button on each row does the same.
const TYPE = "application/x-focuslearn-video";

export function DragRow({ id, className = "", style, children }: { id: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const [dragging, setDragging] = useState(false);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TYPE, id);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`${className} ${dragging ? "opacity-40" : ""}`}
      style={style}
    >
      {children}
    </li>
  );
}

// `folder` is where a dropped video goes; null takes it out of every folder.
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
      className={`rounded-panel transition-[box-shadow,opacity] ${over ? "ring-2 ring-link ring-offset-4 ring-offset-canvas" : ""} ${pending ? "opacity-60" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
