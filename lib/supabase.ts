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
