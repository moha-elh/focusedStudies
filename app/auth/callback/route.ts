import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { supabase } from "@/lib/supabase";

// The magic link lands here with a one-time code; trade it for a session cookie.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (code && !(await (await supabase()).auth.exchangeCodeForSession(code)).error) return NextResponse.redirect(new URL(next, req.url));
  return NextResponse.redirect(new URL("/login?error=link", req.url));
}
