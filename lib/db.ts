import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// ponytail: single JSON file, no users. Swap for Supabase when accounts are added.
const FILE = "data/sessions.json";

export type Note = { t: number; text: string };

export type Session = {
  id: string;
  video_id: string;
  title: string | null;
  recap: string;
  feedback: unknown;
  notes?: Note[]; // taken while watching, t = seconds into the video
  created_at: string;
  updated_at?: string;
};

export async function listSessions(): Promise<Session[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function getSession(id: string) {
  return (await listSessions()).find((s) => s.id === id) ?? null;
}

export async function getSessionByVideo(videoId: string) {
  return (await listSessions()).find((s) => s.video_id === videoId) ?? null;
}

// One entry per video: re-submitting a video updates its notes and moves it to the top.
export async function saveSession(s: Pick<Session, "video_id" | "title" | "recap" | "feedback" | "notes">) {
  const all = await listSessions();
  const prev = all.find((x) => x.video_id === s.video_id);
  const now = new Date().toISOString();
  const row: Session = prev
    ? { ...prev, ...s, title: s.title ?? prev.title, updated_at: now }
    : { ...s, id: randomUUID(), created_at: now };
  await mkdir("data", { recursive: true });
  await writeFile(FILE, JSON.stringify([row, ...all.filter((x) => x.video_id !== s.video_id)], null, 2));
  return row;
}
