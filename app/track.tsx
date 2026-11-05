"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Ids in paths become [id], so the dashboard counts "a watch page", not every video separately.
const clean = (path: string) => path.replace(/^\/watch\/[^/]+/, "/watch/[id]").replace(/^\/library\/[0-9a-f-]{36}/, "/library/[id]");

export function track(name: "page_view" | "client_error", detail?: string) {
  if ((navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl) return; // the visitor asked not to be tracked
  const path = clean(location.pathname);
  if (path.startsWith("/admin")) return;
  // Only where the visit came from (another site's host), never the full URL.
  const ref = document.referrer && new URL(document.referrer).host !== location.host ? new URL(document.referrer).host : null;
  const body = JSON.stringify({ name, path, referrer: name === "page_view" ? ref : null, detail: detail?.slice(0, 500) });
  fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

// In the root layout: one page view per route change, and errors that nothing else caught.
export default function Track() {
  const path = usePathname();
  useEffect(() => track("page_view"), [path]);
  useEffect(() => {
    const onError = (e: ErrorEvent) => track("client_error", e.message);
    const onRejection = (e: PromiseRejectionEvent) => track("client_error", String(e.reason?.message ?? e.reason));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
