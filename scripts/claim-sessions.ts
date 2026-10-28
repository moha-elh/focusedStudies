// One-off: give sessions saved before accounts existed (no owner) to one user. Sign in once first so the user exists.
// Run: node --env-file=.env.local --experimental-strip-types scripts/claim-sessions.ts you@example.com
// The only code that uses the secret key, which bypasses row-level security. Never import this into the app.
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.toLowerCase();
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!email || !SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Usage: claim-sessions.ts <email>, with SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (error) throw new Error(error.message);
const user = data.users.find((u) => u.email?.toLowerCase() === email);
if (!user) throw new Error(`No user ${email}. Sign in to FocusLearn once with that email first.`);

const claimed = await admin.from("sessions").update({ user_id: user.id }).is("user_id", null).select("id");
if (claimed.error) throw new Error(claimed.error.message);
console.log(`Gave ${claimed.data.length} sessions to ${email}.`);
