// Accepts watch?v=, youtu.be/, shorts/, embed/, live/ links or a bare 11-char id.
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s);
    const host = url.hostname.replace(/^(www\.|m\.)/, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1);
    else if (host === "youtube.com" || host === "music.youtube.com") {
      id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

// 222 -> "3:42", 3725 -> "1:02:05"
export function fmtTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const [h, m, sec] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// Groups caption parts into ~30s blocks prefixed with [m:ss], so the grader can cite moments.
// youtube-transcript returns ms for srv3 captions and seconds for the classic format;
// ponytail: integer offsets => ms heuristic, misreads a classic track whose starts are all whole seconds.
export function timestampedTranscript(parts: { text: string; offset: number }[], blockSeconds = 30) {
  const toSec = parts.every((p) => Number.isInteger(p.offset)) ? 1000 : 1;
  const blocks: { start: number; text: string[] }[] = [];
  for (const p of parts) {
    const t = p.offset / toSec;
    const last = blocks.at(-1);
    if (!last || t - last.start >= blockSeconds) blocks.push({ start: t, text: [p.text] });
    else last.text.push(p.text);
  }
  return blocks.map((b) => `[${fmtTime(b.start)}] ${b.text.join(" ").replace(/\s+/g, " ")}`).join("\n");
}

export async function fetchTitle(videoId: string): Promise<string | null> {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`);
  return res.ok ? ((await res.json()) as { title: string }).title : null;
}

// Community-marked sponsor, self-promo and "like and subscribe" segments from SponsorBlock, as [start, end] seconds.
// Called from the browser so a slow API never holds up the page. It fails soft: no segments (404)
// or an outage just mean nothing gets skipped. The API is flaky, so a failed request is retried once.
export async function fetchSkipSegments(videoId: string): Promise<[number, number][]> {
  const categories = encodeURIComponent(JSON.stringify(["sponsor", "selfpromo", "interaction"]));
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=${categories}`);
      if (res.status === 404) return [];
      if (res.ok) return ((await res.json()) as { segment: [number, number] }[]).map((s) => s.segment);
    } catch {}
  }
  return [];
}
