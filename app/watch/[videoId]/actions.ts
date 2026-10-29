"use server";

import { Notes, saveSession } from "@/lib/db";
import { parseVideoId } from "@/lib/youtube";

// Saves the video to the library (and its notes) while watching, so it can be found again before any recap.
export async function saveNotes(videoId: string, title: string | null, notes: unknown) {
  const id = parseVideoId(videoId);
  const parsed = Notes.safeParse(notes);
  if (!id || !parsed.success) return;
  await saveSession({ video_id: id, title: title?.slice(0, 300) ?? null, notes: parsed.data.sort((a, b) => a.t - b.t) });
}
