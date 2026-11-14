import { Notes, saveSession } from "@/lib/db";
import { grade } from "@/lib/grade";
import { parseVideoId } from "@/lib/youtube";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const videoId = parseVideoId(String(body.videoId ?? ""));
  const recap = String(body.recap ?? "").trim();
  if (!videoId || recap.length < 20 || recap.length > 20_000)
    return Response.json({ error: "Write at least a couple of sentences about what you learned." }, { status: 400 });
  const notes = Notes.safeParse(body.notes ?? []);
  if (!notes.success) return Response.json({ error: "Some of your notes couldn't be saved." }, { status: 400 });

  const { title, feedback } = await grade(videoId, recap);

  // Always save the recap so the learner never loses their notes.
  const { id } = await saveSession({ video_id: videoId, title, recap, feedback, notes: notes.data.sort((a, b) => a.t - b.t) });
  return Response.json({ id });
}
