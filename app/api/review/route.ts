import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";
import { Notes, saveSession } from "@/lib/db";
import { fetchTitle, parseVideoId, timestampedTranscript } from "@/lib/youtube";

const MAX_TRANSCRIPT_CHARS = 400_000; // ~100k tokens, a 6h+ video
const MAX_POINTS = 10; // per list; the session page shows the top 3 and the full list opens in a pop-up

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
  missed: z.array(Point).describe(`The most important ideas the learner did not mention, at most ${MAX_POINTS}, biggest first`),
  incorrect: z.array(Point).describe("Statements in the recap that contradict the video, each with the correction"),
});
export type Feedback = z.infer<typeof Feedback>;
export type FeedbackPoint = z.infer<typeof Point>;

// Lets you try the UI without an API key; clearly labelled so it's never mistaken for real grading.
const DEMO: Feedback = {
  score: 72,
  summary: "DEMO feedback: add GROQ_API_KEY (or ANTHROPIC_API_KEY) to .env.local to get real grading.",
  covered: [{ text: "(demo) An idea you explained correctly would appear here", t: 30 }],
  missed: [{ text: "(demo) An important point from the video you didn't mention", t: 95 }],
  incorrect: [{ text: "(demo) Something you said that contradicts the video, with the correction", t: 150 }],
};

const SYSTEM =
  "You are a learning coach. A learner just watched a video and wrote, from memory, what they learned. " +
  "Compare their recap against the transcript. Judge understanding, not wording. Only list ideas that matter; " +
  "for each point, give the time of the transcript block it comes from so the learner can jump there; " +
  "skip filler, sponsor reads and small talk. Score from 0 to 100. " +
  `Keep every list short: at most ${MAX_POINTS} points, most important first; merge related details into one point, ` +
  "and leave a list empty rather than padding it. Write feedback directly to the learner (\"you\").";

// Groq's OpenAI-compatible API with strict JSON-schema output; the reply is still validated before it's saved.
// ponytail: Groq's free tier caps tokens per minute, so long transcripts can be rejected; a paid tier lifts it.
async function gradeWithGroq(content: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content }],
      response_format: { type: "json_schema", json_schema: { name: "feedback", strict: true, schema: z.toJSONSchema(Feedback) } },
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return Feedback.safeParse(JSON.parse(json.choices[0].message.content)).data ?? null;
}

async function gradeWithClaude(content: string) {
  const res = await new Anthropic().messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Feedback) },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });
  return res.parsed_output;
}

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
        console.warn("transcript", videoId, e instanceof Error ? e.message : e);
        return null;
      }),
  ]);

  let feedback: Feedback | { error: string };
  if (!transcript) feedback = { error: "We couldn't get this video's captions (it may not have any), so it couldn't be graded. Your notes are saved." };
  else if (transcript.length > MAX_TRANSCRIPT_CHARS) feedback = { error: "This video is too long to grade. Your notes are saved." };
  else if (!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) feedback = DEMO;
  else {
    const content = `<video_title>${title ?? "unknown"}</video_title>\n<transcript>\n${transcript}\n</transcript>\n\n<learner_recap>\n${recap}\n</learner_recap>`;
    try {
      const graded = process.env.GROQ_API_KEY ? await gradeWithGroq(content) : await gradeWithClaude(content);
      feedback = graded
        ? { ...graded, covered: graded.covered.slice(0, MAX_POINTS), missed: graded.missed.slice(0, MAX_POINTS), incorrect: graded.incorrect.slice(0, MAX_POINTS) }
        : { error: "The AI couldn't grade this recap. Your notes are saved." };
    } catch (e) {
      console.error("grading", e instanceof Error ? e.message : e);
      feedback = { error: "Grading failed. Your notes are saved." };
    }
  }

  // Always save the recap so the learner never loses their notes.
  const { id } = await saveSession({ video_id: videoId, title, recap, feedback, notes: notes.data.sort((a, b) => a.t - b.t) });
  return Response.json({ id });
}
