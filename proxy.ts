import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can open. Everything else needs a signed-in user.
const PUBLIC = ["/", "/login", "/auth/callback"];

// Runs before every page and API call: refreshes the Supabase session cookie, then gates signed-out visitors.
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      },
    },
  });
  const { data } = await sb.auth.getClaims();
  const path = req.nextUrl.pathname;
  if (data?.claims || PUBLIC.includes(path)) return res;

  if (path.startsWith("/api/")) return Response.json({ error: "Your session ended. Sign in again; your recap is kept." }, { status: 401 });
  const login = new URL("/login", req.url);
  login.searchParams.set("next", path + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip static files (any image or font type), or signed-out visitors get redirected instead of the file.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?)$).*)"],
};
