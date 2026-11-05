import Link from "next/link";
import { listFolders, listSessions } from "@/lib/db";
import { avgScore, BackToLibrary, Label, scoreColor, scoreOf, Thumb } from "../ui";
import Folder from "./folder";
import FolderButton from "./folder-button";
import ColorWheel from "./color-wheel";
import NewFolder from "./new-folder";
import { recolorFolder } from "./actions";
import { FOLDER_COLORS, type FolderColor } from "./colors";
import RemoveButton from "./remove-button";

// Like a file manager: the library shows its top-level folders, then the videos not in one. A folder shows the
// folders inside it, then its videos.
export default async function Library({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  const [all, rows] = await Promise.all([listSessions(), listFolders()]);
  const colors = new Map(rows.map((f) => [f.name, f.color]));
  const parents = new Map(rows.map((f) => [f.name, f.parent]));
  const folders = Map.groupBy(
    all.filter((s) => s.folder),
    (s) => s.folder!,
  );
  for (const { name } of rows) if (!folders.has(name)) folders.set(name, []);
  const names = [...folders.keys()].sort((a, b) => a.localeCompare(b));
  const inside = (parent: string | null) => names.filter((n) => (parents.get(n) ?? null) === parent);
  // "Courses / Python": the way down to a folder. The depth cap only guards against bad data.
  const path = (name: string) => {
    const parts = [name];
    for (let p = parents.get(name); p && parts.length < 20; p = parents.get(p)) parts.unshift(p);
    return parts.join(" / ");
  };
  // An unknown folder (its last video moved out) shows the library.
  const want = (await searchParams).folder;
  const on = want && folders.has(want) ? want : null;
  const inView = on ? folders.get(on)! : all;
  const sessions = on ? inView : all.filter((s) => !s.folder);
  const avg = avgScore(inView);
  const shown = inside(on);
  const up = on ? (parents.get(on) ?? null) : null;

  return (
    <main className="wrap flex flex-col pt-10">
      <header className="rise flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-8">
        <div className="min-w-0">
          {on ? (
            <BackToLibrary className="mb-6" {...(up && { href: `/library?folder=${encodeURIComponent(up)}`, label: `Back to ${up}` })} />
          ) : (
            <Label className="mb-4">Library</Label>
          )}
          <h1 className="text-h1 font-semibold break-words sm:text-hero">{on ?? "Everything you’ve learned."}</h1>
          {on && (
            // Plain buttons in a form: picking a color saves it, no script needed.
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted">Folder color</span>
              <form action={recolorFolder.bind(null, on)} className="contents">
                {(Object.keys(FOLDER_COLORS) as FolderColor[]).map((c) => (
                  <button
                    key={c}
                    name="color"
                    value={c}
                    aria-label={c}
                    title={c[0].toUpperCase() + c.slice(1)}
                    aria-pressed={(colors.get(on) ?? "blue") === c}
                    style={{ background: FOLDER_COLORS[c][0] }}
                    className="size-7 rounded-full ring-ink ring-offset-2 ring-offset-canvas transition-transform hover:scale-110 aria-pressed:ring-2"
                  />
                ))}
              </form>
              <ColorWheel value={colors.get(on)} action={recolorFolder.bind(null, on)} />
            </div>
          )}
        </div>
        {inView.length > 0 && (
          <dl className="flex gap-12">
            <div>
              <dt className="text-muted">Videos</dt>
              <dd className="text-h1 font-semibold tabular-nums">{inView.length}</dd>
            </div>
            {avg !== null && (
              <div>
                <dt className="text-muted">Average</dt>
                <dd className={`text-h1 font-semibold tabular-nums ${scoreColor(avg)}`}>{avg}</dd>
              </div>
            )}
          </dl>
        )}
      </header>

      {(on || all.length > 0 || names.length > 0) && (
        <section aria-label="Folders" className="pt-10">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((name, i) => (
              <li key={name} className="rise" style={{ "--d": `${Math.min(i, 8) * 60}ms` } as React.CSSProperties}>
                <Folder name={name} sessions={folders.get(name)!} color={colors.get(name)} subfolders={inside(name).length} />
              </li>
            ))}
            <li className="rise" style={{ "--d": `${Math.min(shown.length, 8) * 60}ms` } as React.CSSProperties}>
              <NewFolder
                parent={on ?? undefined}
                videos={all.map((s) => ({ id: s.id, videoId: s.video_id, title: s.title ?? s.video_id, folder: s.folder ? path(s.folder) : null }))}
              />
            </li>
          </ul>
          {sessions.length > 0 && shown.length > 0 && (
            <h2 className="mt-16 border-b border-line pb-4 text-xl font-semibold">{on ? "Videos" : "Not in a folder"}</h2>
          )}
        </section>
      )}

      {on && !sessions.length ? (
        <p className="rise py-10 leading-normal text-muted">
          {shown.length ? "No videos directly in this folder." : "This folder is empty."} Use the folder button on any video to move it here.
        </p>
      ) : !all.length && !names.length ? (
        <section className="rise relative mt-8 overflow-hidden rounded-[32px] bg-[#4d8fd9] [--d:150ms]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero.webp" alt="" className="absolute inset-0 size-full object-cover object-[50%_70%]" />
          <div className="relative m-4 flex max-w-md flex-col gap-4 rounded-panel bg-paper p-6 sm:m-10">
            <h2 className="text-2xl font-semibold">Your first lesson is one link away.</h2>
            <p className="leading-normal text-muted">
              Pick a video you&apos;ve been meaning to learn from. Watch it here, write what you remember, and it&apos;ll be saved with your feedback.
            </p>
            <Link href="/?paste=1" className="btn self-start">
              Pick a video ↗
            </Link>
          </div>
        </section>
      ) : (
        <ul className={on ? "pt-2" : ""}>
          {sessions.map((s, i) => {
            const score = scoreOf(s.feedback);
            return (
              <li
                key={s.id}
                className="rise group/row flex items-center border-b border-line"
                style={{ "--d": `${Math.min(i, 8) * 60}ms` } as React.CSSProperties}
              >
                {/* No recap yet means there's nothing to review, so go straight back to the video. */}
                <Link
                  href={s.recap ? `/library/${s.id}` : `/watch/${s.video_id}`}
                  className="group grid min-w-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-4 px-0 py-5 transition-colors hover:bg-paper sm:grid-cols-[auto_1fr_auto_auto] sm:gap-8 sm:px-5"
                >
                  <Thumb videoId={s.video_id} className="w-28 transition-transform duration-300 group-hover:scale-[1.03] sm:w-52" />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="line-clamp-2 font-semibold break-words sm:text-xl">{s.title ?? s.video_id}</p>
                    <p className="hidden truncate text-muted sm:block">
                      {s.recap || `Still watching · ${s.notes?.length ?? 0} ${s.notes?.length === 1 ? "note" : "notes"}`}
                    </p>
                  </div>
                  <span className="hidden text-sm whitespace-nowrap text-muted sm:block">
                    {new Date(s.updated_at ?? s.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className={`w-12 text-right text-2xl font-semibold tabular-nums sm:text-display ${score !== null ? scoreColor(score) : "text-muted"}`}>
                    {score ?? "–"}
                  </span>
                </Link>
                {/* Shown on hover with a mouse, always on touch screens. */}
                <FolderButton
                  id={s.id}
                  folder={s.folder ?? null}
                  folders={names.map((n): [string, string] => [n, path(n)])}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition-[opacity,color,background-color] hover:bg-line hover:text-ink focus:opacity-100 pointer-fine:opacity-0 group-hover/row:opacity-100"
                />
                <RemoveButton
                  id={s.id}
                  videoId={s.video_id}
                  title={s.title ?? s.video_id}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition-[opacity,color,background-color] hover:bg-bad-soft hover:text-bad focus:opacity-100 pointer-fine:opacity-0 group-hover/row:opacity-100"
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
