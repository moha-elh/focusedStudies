// Where to land after signing in: only paths on this site, so a crafted link can't bounce users elsewhere.
export function safeNext(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/")) return "/library";
  const url = new URL(next, "http://site.invalid");
  // Dot segments can normalize "/.//evil.com" to "//evil.com", which a later redirect would read as another host.
  return url.origin === "http://site.invalid" && !url.pathname.startsWith("//") ? url.pathname + url.search : "/library";
}
