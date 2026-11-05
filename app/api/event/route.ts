import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

// Page views and client errors for /admin. Signed-out visitors count too, so proxy.ts lets this through.
// ponytail: no rate limit, anyone can add junk rows (capped in size by the table); add one if it's abused.
const Event = z.object({
  name: z.enum(["page_view", "client_error"]),
  path: z.string().max(200),
  referrer: z.string().max(200).nullish(),
  detail: z.string().max(500).nullish(),
});

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;

export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  const parsed = Event.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });

  // A random id in a first-party cookie, so the dashboard can count visitors without knowing who they are.
  const store = await cookies();
  let visitor = store.get("vid")?.value;
  if (!visitor || !/^[0-9a-f-]{36}$/.test(visitor)) {
    visitor = randomUUID();
    store.set("vid", visitor, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  const { error } = await (await supabase()).from("events").insert({ ...parsed.data, visitor });
  if (error) console.warn("event", error.message);
  return new Response(null, { status: 204 });
}
