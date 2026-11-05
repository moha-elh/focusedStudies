import { randomUUID } from "node:crypto";
import { z } from "zod";
import { supabase } from "./supabase";

export type Note = { t: number; text: string };
export const Notes = z.array(z.object({ t: z.number().min(0), text: z.string().trim().min(1).max(1000) })).max(300);

export type Session = {
  id: string;
  video_id: string;
  title: string | null;
  recap: string;
  feedback: unknown;
  notes?: Note[]; // taken while watching, t = seconds into the video
  folder?: string | null; // library folder, null = unsorted
  created_at: string;
  updated_at?: string | null;
};

// recap/feedback are left out while watching (notes only); a new row then starts with no recap yet.
type NewSession = Pick<Session, "video_id" | "title" | "notes"> & Partial<Pick<Session, "recap" | "feedback">>;

// Every query runs as the signed-in user; row-level security (supabase/migrations) scopes it to their sessions.
const COLUMNS = "id, video_id, title, recap, feedback, notes, folder, created_at, updated_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Throws on errors instead of returning nothing, so a failed read never looks like an empty library.
function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
}

export async function listSessions(): Promise<Session[]> {
  return check(await (await supabase()).from("sessions").select(COLUMNS).order("last_active", { ascending: false })) ?? [];
}

export async function getSession(id: string): Promise<Session | null> {
  if (!UUID.test(id)) return null; // Postgres rejects a malformed uuid with an error; that's just "not found"
  return check(await (await supabase()).from("sessions").select(COLUMNS).eq("id", id).maybeSingle());
}

export async function getSessionByVideo(videoId: string): Promise<Session | null> {
  return check(await (await supabase()).from("sessions").select(COLUMNS).eq("video_id", videoId).maybeSingle());
}

// One entry per video per user: re-submitting a video updates its notes and moves it to the top.
// user_id is filled in by the database (default auth.uid()), so it can't be spoofed from here.
export async function saveSession(s: NewSession): Promise<Session> {
  const prev = await getSessionByVideo(s.video_id);
  const now = new Date().toISOString();
  const row: Session = prev
    ? { ...prev, ...s, title: s.title ?? prev.title, updated_at: now }
    : { recap: "", feedback: null, ...s, id: randomUUID(), created_at: now };
  return check(await (await supabase()).from("sessions").upsert(row, { onConflict: "user_id,video_id" }).select(COLUMNS).single())!;
}

// Doesn't touch updated_at, so filing a video away doesn't move it to the top of the library.
export async function setFolder(ids: string[], folder: string | null) {
  ids = ids.filter((id) => UUID.test(id));
  if (!ids.length) return;
  check(await (await supabase()).from("sessions").update({ folder }).in("id", ids));
}

// Folder names, including empty ones; folders that have videos are also found on the videos themselves.
export async function listFolders(): Promise<{ name: string; color: string | null }[]> {
  return check(await (await supabase()).from("folders").select("name, color")) ?? [];
}

// Creates the folder's row if it only existed on its videos.
export async function setFolderColor(name: string, color: string | null) {
  check(await (await supabase()).from("folders").upsert({ name, color }, { onConflict: "user_id,name" }));
}

// Already there is fine (user_id comes from the login token, like sessions).
export async function addFolder(name: string, color: string | null = null) {
  check(await (await supabase()).from("folders").upsert({ name, color }, { onConflict: "user_id,name", ignoreDuplicates: true }));
}

// Row-level security limits the delete to the caller's own row; someone else's id just deletes nothing.
export async function deleteSession(id: string) {
  if (!UUID.test(id)) return;
  check(await (await supabase()).from("sessions").delete().eq("id", id));
}
