// One-off: copy data/sessions.json into Supabase, keeping ids so existing links still work. Safe to re-run.
// Run: node --env-file=.env.local --experimental-strip-types scripts/import-sessions.ts
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");

const rows = JSON.parse(await readFile("data/sessions.json", "utf8"));
const { error } = await createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  .from("sessions")
  .upsert(rows.map(({ id, video_id, title, recap, feedback, notes, created_at, updated_at }: Record<string, unknown>) =>
    ({ id, video_id, title, recap, feedback, notes: notes ?? [], created_at, updated_at })), { onConflict: "video_id" });
if (error) throw new Error(error.message);
console.log(`Imported ${rows.length} sessions.`);
