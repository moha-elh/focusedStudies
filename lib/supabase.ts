import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Acts as the signed-in user, so Postgres row-level security limits every query to their own rows.
// Uses the publishable key on the server only; the secret key is never needed by the app.
export async function supabase() {
  const store = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {} // Server Components can't set cookies; proxy.ts refreshes the session instead.
      },
    },
  });
}

// Verified from the JWT signature, not just read from the cookie.
export async function currentUser() {
  const { data } = await (await supabase()).auth.getClaims();
  return data?.claims ?? null;
}

// True only when the app talks to the Supabase running on this machine (`npm run dev`). Turns on the
// email + password test sign-in, which the production project never accepts.
export const LOCAL_SUPABASE = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(process.env.SUPABASE_URL ?? "");

// The seeded local account (supabase/seed.sql). Only ever used against the local database.
export const TEST_USER = { email: "test@focuslearn.dev", password: "focuslearn" };
// Set by signing out locally, so you can look at the signed-out pages instead of being signed straight back in.
export const STAY_SIGNED_OUT = "local-signed-out";
