import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

export type Note = { t: number; text: string };

export type Session = {
  id: string;
  video_id: string;
  title: string | null;
  recap: string;
  feedback: unknown;
  notes?: Note[]; // taken while watching, t = seconds into the video
  created_at: string;
  updated_at?: string | null;
};

type NewSession = Pick<Session, "video_id" | "title" | "recap" | "feedback" | "notes">;

// Supabase when its keys are set (see supabase/schema.sql), otherwise a local JSON file so the app runs with no setup.
// ponytail: no users yet, one shared library. Add a user_id column + Supabase Auth with accounts.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
const COLUMNS = "id, video_id, title, recap, feedback, notes, created_at, updated_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Throws on errors instead of returning nothing, so a failed read never looks like an empty library.
function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
}

export async function listSessions(): Promise<Session[]> {
  if (supabase) return check(await supabase.from("sessions").select(COLUMNS).order("last_active", { ascending: false })) ?? [];
  return readFileStore();
}

export async function getSession(id: string): Promise<Session | null> {
  if (!supabase) return (await readFileStore()).find((s) => s.id === id) ?? null;
  if (!UUID.test(id)) return null; // Postgres rejects a malformed uuid with an error; that's just "not found"
  return check(await supabase.from("sessions").select(COLUMNS).eq("id", id).maybeSingle());
}

export async function getSessionByVideo(videoId: string): Promise<Session | null> {
  if (!supabase) return (await readFileStore()).find((s) => s.video_id === videoId) ?? null;
  return check(await supabase.from("sessions").select(COLUMNS).eq("video_id", videoId).maybeSingle());
}

// One entry per video: re-submitting a video updates its notes and moves it to the top.
export async function saveSession(s: NewSession): Promise<Session> {
  const prev = await getSessionByVideo(s.video_id);
  const now = new Date().toISOString();
  const row: Session = prev
    ? { ...prev, ...s, title: s.title ?? prev.title, updated_at: now }
    : { ...s, id: randomUUID(), created_at: now };
  if (supabase) return check(await supabase.from("sessions").upsert(row, { onConflict: "video_id" }).select(COLUMNS).single())!;

  const all = await readFileStore();
  await mkdir("data", { recursive: true });
  // Write then rename, so a crash mid-write never leaves a half-written file.
  await writeFile(`${FILE}.tmp`, JSON.stringify([row, ...all.filter((x) => x.video_id !== s.video_id)], null, 2));
  await rename(`${FILE}.tmp`, FILE);
  return row;
}

const FILE = "data/sessions.json";

// Only a missing file means "no sessions". Any other read or parse error throws, so a save can't overwrite the library.
async function readFileStore(): Promise<Session[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}
