// Where to land after signing in: only paths on this site, so a crafted link can't bounce users elsewhere.
export function safeNext(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/")) return "/library";
  const url = new URL(next, "http://site.invalid");
  return url.origin === "http://site.invalid" ? url.pathname + url.search : "/library";
}
