import { notFound } from "next/navigation";
import { getSessionByVideo } from "@/lib/db";
import { fetchTitle, parseVideoId } from "@/lib/youtube";
import Player from "./player";

export default async function WatchPage({ params }: { params: Promise<{ videoId: string }> }) {
  const videoId = parseVideoId((await params).videoId);
  if (!videoId) notFound();
  const [title, existing] = await Promise.all([fetchTitle(videoId).catch(() => null), getSessionByVideo(videoId)]);
  return <Player videoId={videoId} title={title ?? existing?.title ?? null} previousRecap={existing?.recap ?? ""} />;
}
