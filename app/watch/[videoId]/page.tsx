import { notFound } from "next/navigation";
import { getSessionByVideo } from "@/lib/db";
import { fetchTitle, parseVideoId } from "@/lib/youtube";
import Player from "./player";

type Props = { params: Promise<{ videoId: string }>; searchParams: Promise<{ t?: string }> };

export default async function WatchPage({ params, searchParams }: Props) {
  const videoId = parseVideoId((await params).videoId);
  if (!videoId) notFound();
  const start = Math.max(0, Math.floor(Number((await searchParams).t) || 0));
  const [title, existing] = await Promise.all([fetchTitle(videoId).catch(() => null), getSessionByVideo(videoId)]);
  return (
    <Player
      videoId={videoId}
      title={title ?? existing?.title ?? null}
      start={start}
      previousRecap={existing?.recap ?? ""}
      previousNotes={existing?.notes ?? []}
      demo={!process.env.ANTHROPIC_API_KEY}
    />
  );
}
