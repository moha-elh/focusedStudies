import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";
import { saveSession } from "@/lib/db";
import { fetchTitle, parseVideoId, timestampedTranscript } from "@/lib/youtube";

const MAX_TRANSCRIPT_CHARS = 400_000; // ~100k tokens, a 6h+ video

const Point = z.object({
  text: z.string(),
  t: z
    .number()
    .nullable()
    .describe("Seconds into the video where this is covered, taken from the nearest [m:ss] marker; null if not tied to one moment"),
});

const Feedback = z.object({
  score: z.number().describe("0-100: how much of the video's key content the recap captured, penalising errors"),
  summary: z.string().describe("2-3 sentences of encouraging, specific feedback"),
  covered: z.array(Point).describe("Key ideas the learner got right"),
  missed: z.array(Point).describe("Important ideas from the video the learner did not mention"),
  incorrect: z.array(Point).describe("Statements in the recap that contradict the video, each with the correction"),
});
export type Feedback = z.infer<typeof Feedback>;
export type FeedbackPoint = z.infer<typeof Point>;

const Notes = z.array(z.object({ t: z.number().min(0), text: z.string().trim().min(1).max(1000) })).max(300);

// Lets you try the UI without an API key; clearly labelled so it's never mistaken for real grading.
const DEMO: Feedback = {
  score: 72,
  summary: "DEMO feedback: add ANTHROPIC_API_KEY to .env.local to get real grading.",
  covered: [{ text: "(demo) An idea you explained correctly would appear here", t: 30 }],
  missed: [{ text: "(demo) An important point from the video you didn't mention", t: 95 }],
  incorrect: [{ text: "(demo) Something you said that contradicts the video, with the correction", t: 150 }],
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const videoId = parseVideoId(String(body.videoId ?? ""));
  const recap = String(body.recap ?? "").trim();
  if (!videoId || recap.length < 20 || recap.length > 20_000)
    return Response.json({ error: "Write at least a couple of sentences about what you learned." }, { status: 400 });
  const notes = Notes.safeParse(body.notes ?? []);
  if (!notes.success) return Response.json({ error: "Some of your notes couldn't be saved." }, { status: 400 });

  const [title, transcript] = await Promise.all([
    fetchTitle(videoId).catch(() => null),
    YoutubeTranscript.fetchTranscript(videoId)
      .then((parts) => timestampedTranscript(parts))
      .catch((e) => {
        console.error("transcript", videoId, e);
        return null;
      }),
  ]);

  let feedback: Feedback | { error: string };
  if (!transcript) feedback = { error: "This video has no captions, so it couldn't be graded. Your notes are saved." };
  else if (transcript.length > MAX_TRANSCRIPT_CHARS) feedback = { error: "This video is too long to grade. Your notes are saved." };
  else if (!process.env.ANTHROPIC_API_KEY) feedback = DEMO;
  else {
    try {
      const res = await new Anthropic().messages.parse({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        output_config: { effort: "low", format: zodOutputFormat(Feedback) },
        system:
          "You are a learning coach. A learner just watched a video and wrote, from memory, what they learned. " +
          "Compare their recap against the transcript. Judge understanding, not wording. Only list ideas that matter; " +
          "for each point, give the time of the transcript block it comes from so the learner can jump there; " +
          "skip filler, sponsor reads and small talk. Write feedback directly to the learner (\"you\").",
        messages: [
          {
            role: "user",
            content: `<video_title>${title ?? "unknown"}</video_title>\n<transcript>\n${transcript}\n</transcript>\n\n<learner_recap>\n${recap}\n</learner_recap>`,
          },
        ],
      });
      feedback = res.parsed_output ?? { error: "The AI couldn't grade this recap. Your notes are saved." };
    } catch (e) {
      console.error("claude", e);
      feedback = { error: "Grading failed. Your notes are saved." };
    }
  }

  // Always save the recap so the learner never loses their notes.
  const { id } = await saveSession({ video_id: videoId, title, recap, feedback, notes: notes.data.sort((a, b) => a.t - b.t) });
  return Response.json({ id });
}
