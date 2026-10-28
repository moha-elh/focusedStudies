// Security check: with only the publishable key and no login, the sessions table must be unreadable and unwritable.
// Run: node --env-file=.env.local --experimental-strip-types scripts/check-rls.ts
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
const read = await anon.from("sessions").select("id");
assert.equal(read.data?.length ?? 0, 0, "signed-out visitors can read sessions");
const write = await anon.from("sessions").insert({ video_id: "rlscheck000", recap: "x" });
assert.ok(write.error, "signed-out visitors can insert sessions");
console.log("ok");
