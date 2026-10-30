import { notFound } from "next/navigation";
import { getSessionByVideo } from "@/lib/db";
import { fetchTitle, parseVideoId } from "@/lib/youtube";
import Player from "./player";

type Props = { params: Promise<{ videoId: string }>; searchParams: Promise<{ t?: string }> };

export default async function WatchPage({ params, searchParams }: Props) {
  const videoId = parseVideoId((await params).videoId);
  if (!videoId) notFound();
  const { t } = await searchParams;
  // No ?t= means "pick up where I left off", which only the browser knows (see player.tsx).
  const start = t === undefined ? null : Math.max(0, Math.floor(Number(t) || 0));
  const existing = await getSessionByVideo(videoId);
  // Only ask YouTube for the title the first time; after that it's saved with the session.
  const title = existing?.title ?? (await fetchTitle(videoId).catch(() => null));
  return (
    <Player
      videoId={videoId}
      title={title}
      start={start}
      previousRecap={existing?.recap ?? ""}
      previousNotes={existing?.notes ?? []}
      demo={!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY}
    />
  );
}
