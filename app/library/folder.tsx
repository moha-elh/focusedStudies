import Link from "next/link";
import type { Session } from "@/lib/db";
import { avgScore, scoreColor, Thumb } from "../ui";
import { folderStyle } from "./colors";

// A folder you could pick up, in its macOS tag color (blue by default): a tab on the back, up to three of its videos sticking out, and a front flap that tips
// open on hover while the videos lift.
export default function Folder({ name, sessions, color, subfolders = 0 }: { name: string; sessions: Session[]; color?: string | null; subfolders?: number }) {
  const avg = avgScore(sessions);
  const fan = ["left-[8%] top-[22%] -rotate-6", "left-[22%] top-[14%] rotate-2", "left-[34%] top-[20%] rotate-[8deg]"];
  return (
    <Link href={`/library?folder=${encodeURIComponent(name)}`} className="group block" style={folderStyle(color)}>
      <span className="relative block aspect-[4/3] [perspective:900px]">
        <span aria-hidden className="absolute top-0 left-0 h-[18%] w-[42%] rounded-t-[14px] bg-(--back)" />
        <span aria-hidden className="absolute inset-x-0 top-[8%] bottom-0 rounded-panel rounded-tl-none bg-linear-to-b from-(--back) to-(--back-2)" />
        {sessions.slice(0, 3).map((s, i) => (
          <Thumb
            key={s.id}
            videoId={s.video_id}
            className={`absolute w-[58%] shadow-[0_4px_12px_rgb(26_33_48/0.2)] transition-transform duration-300 ease-out group-hover:-translate-y-[18%] ${fan[i]}`}
          />
        ))}
        <span className="absolute inset-x-0 bottom-0 flex h-[60%] origin-bottom flex-col justify-end gap-1 rounded-panel bg-linear-to-b from-(--front) to-(--front-2) p-4 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_-4px_12px_rgb(20_80_140/0.15)] transition-transform duration-300 ease-out group-hover:[transform:rotateX(-22deg)] sm:p-5">
          <span className="truncate text-xl font-semibold">{name}</span>
          <span className="text-sm text-ink/70">
            {subfolders > 0 && `${subfolders} ${subfolders === 1 ? "folder" : "folders"} · `}
            {sessions.length} {sessions.length === 1 ? "video" : "videos"}
            {avg !== null && (
              <>
                {" · average "}
                <span className={`font-semibold tabular-nums ${scoreColor(avg)}`}>{avg}</span>
              </>
            )}
          </span>
        </span>
      </span>
    </Link>
  );
}
