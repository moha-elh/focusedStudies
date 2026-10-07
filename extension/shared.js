// Loaded first by content.js and popup.html. ESLint checks files one by one, so it can't see they're used.
/* eslint-disable @typescript-eslint/no-unused-vars */

// Where FocusLearn runs. Change this once the app is deployed.
const FOCUSLEARN = "http://localhost:3000";

// watch?v=, shorts/ and live/ links → the 11-character video id, or null.
function videoId(href) {
  if (!href) return null;
  const url = new URL(href);
  return url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|live)\/([\w-]{11})/)?.[1] ?? null;
}

// 222 -> "3:42", 3725 -> "1:02:05"
function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const [h, m, sec] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
