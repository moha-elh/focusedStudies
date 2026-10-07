import type { Feedback, FeedbackPoint } from "../app/api/review/route.ts";
import type { Session } from "./db.ts";
import { fmtTime } from "./youtube.ts";

// Feedback saved before timestamps existed is a plain string.
export const toPoint = (p: FeedbackPoint | string): FeedbackPoint => (typeof p === "string" ? { text: p, t: null } : p);

// Plain Markdown: downloads as a .md file, and Notion turns it into blocks when pasted or imported.
export function toMarkdown(s: Session) {
  const at = (t: number) => `[${fmtTime(t)}](https://youtu.be/${s.video_id}?t=${Math.floor(t)})`;
  const out = [`# ${s.title ?? s.video_id}`, "", `https://www.youtube.com/watch?v=${s.video_id}`];

  const fb = s.feedback as Feedback | { error: string } | null;
  if (fb && !("error" in fb)) {
    out.push("", `**Score:** ${fb.score}/100`, "", fb.summary);
    for (const [key, title] of [["covered", "You got right"], ["missed", "You missed"], ["incorrect", "Not quite right"]] as const) {
      if (!fb[key].length) continue;
      out.push("", `## ${title}`, ...fb[key].map(toPoint).map((p) => `- ${p.text}${p.t === null ? "" : ` (${at(p.t)})`}`));
    }
  }
  if (s.notes?.length) out.push("", "## Notes while watching", ...s.notes.map((n) => `- ${at(n.t)} ${n.text}`));
  out.push("", "## Your recap", "", s.recap.trim(), "");
  return out.join("\n");
}
