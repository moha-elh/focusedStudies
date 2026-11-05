import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { scoreColor } from "../ui";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

type Day = { d: string; views: number; visitors: number; signups: number; videos: number };
type Stats = {
  since: string;
  users_total: number;
  users_new: number;
  active_7d: number;
  active: number;
  visitors: number;
  views: number;
  videos_opened: number;
  recaps: number;
  avg_score: number | null;
  avg_notes: number | null;
  folder_users: number;
  by_day: Day[];
  funnel: { signed_up: number; opened: number; recapped: number; returned: number };
  scores: { low: number; mid: number; good: number; great: number };
  providers: { name: string; n: number }[];
  top_pages: { path: string; n: number }[];
  top_referrers: { host: string; n: number }[];
  top_videos: { video_id: string; title: string | null; n: number }[];
  grading_errors: number;
  client_errors: number;
  issues: { kind: "grading" | "client"; at: string; detail: string | null; place: string }[];
};
type User = { email: string | null; joined: string; provider: string; active: string | null; videos: number; score: number | null };
type Note = { id: string; message: string; page: string | null; at: string; signed_in: boolean; handled_at: string | null };
type More = {
  prev: { visitors: number; users_new: number; active: number; recaps: number; avg_score: number | null };
  users: User[];
  feedback: Note[];
};

const RANGES = [7, 30, 90];
// Section, menu label, page title.
const TABS = [
  ["overview", "Overview", "How FocusLearn is doing"],
  ["users", "Users", "Who uses FocusLearn"],
  ["traffic", "Traffic", "Where visits come from"],
  ["content", "Content", "What people watch"],
  ["issues", "Issues", "What went wrong"],
  ["feedback", "Feedback", "What people asked for"],
] as const;
type Tab = (typeof TABS)[number][0];
type Query = { days?: string; tab?: string; sort?: string; show?: string };

const n = (v: number) => v.toLocaleString("en-US");
const day = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const when = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");
const total = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

async function markFeedback(id: string, handled: boolean) {
  "use server";
  await (await supabase()).rpc("admin_handle_feedback", { fid: id, handled });
  revalidatePath("/admin");
}

// Only admins get here: admin_stats() and admin_more() refuse everyone else (supabase/migrations), and then this is a
// plain 404, so the page doesn't even admit it exists. Signed-out visitors are sent to sign in by proxy.ts first.
export default async function Admin({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams;
  const days = RANGES.includes(Number(q.days)) ? Number(q.days) : 30;
  const tab: Tab = TABS.some(([t]) => t === q.tab) ? (q.tab as Tab) : "overview";
  const db = await supabase();
  const [stats, more] = await Promise.all([db.rpc("admin_stats", { period: days }), db.rpc("admin_more", { period: days })]);
  if (stats.error || !stats.data || more.error || !more.data) notFound();
  const s = stats.data as Stats;
  const m = more.data as More;
  const href = (next: Query) => {
    const p = new URLSearchParams({ days: String(days), tab, ...next });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    if (p.get("tab") === "overview") p.delete("tab");
    if (p.get("days") === "30") p.delete("days");
    return `/admin${p.size ? `?${p}` : ""}`;
  };
  const open = m.feedback.filter((f) => !f.handled_at).length;

  return (
    <main className="wrap grid gap-8 pt-10 pb-24 lg:grid-cols-[208px_minmax(0,1fr)]">
      {/* The menu: a column on wide screens, a scrolling row above the page on narrow ones. */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <nav aria-label="Sections" className="flex gap-1 overflow-x-auto rounded-panel bg-paper p-2 lg:flex-col">
          <p className="hidden px-4 pt-2 pb-3 text-sm text-muted lg:block">Admin</p>
          {TABS.map(([t, label]) => (
            <Link
              key={t}
              href={href({ tab: t, sort: "", show: "" })}
              aria-current={t === tab ? "page" : undefined}
              className="flex shrink-0 items-center justify-between gap-3 rounded-media px-4 py-2.5 text-muted transition-colors hover:bg-canvas hover:text-ink aria-[current]:bg-ink aria-[current]:text-paper"
            >
              {label}
              {t === "issues" && s.issues.length > 0 && <Count n={s.grading_errors + s.client_errors} />}
              {t === "feedback" && open > 0 && <Count n={open} />}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-8">
        <header className="rise flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted">
              {day(s.since)} to today · {days} days
            </p>
            <h1 className="text-display font-semibold">{TABS.find(([t]) => t === tab)![2]}</h1>
          </div>
          <nav aria-label="Period" className="flex rounded-full bg-panel p-1">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={href({ days: String(r) })}
                aria-current={r === days || undefined}
                className="rounded-full px-4 py-1.5 text-sm text-muted transition-colors hover:text-ink aria-[current]:bg-paper aria-[current]:text-ink aria-[current]:shadow-[0_1px_4px_rgb(26_33_48/0.1)]"
              >
                {r} days
              </Link>
            ))}
          </nav>
        </header>

        {tab === "overview" && <Overview s={s} m={m} days={days} href={href} />}
        {tab === "users" && <Users s={s} users={m.users} sort={q.sort} href={href} />}
        {tab === "traffic" && <Traffic s={s} />}
        {tab === "content" && <Content s={s} />}
        {tab === "issues" && <Issues s={s} show={q.show} href={href} />}
        {tab === "feedback" && <FeedbackList notes={m.feedback} show={q.show} href={href} />}
      </div>
    </main>
  );
}

function Count({ n: v }: { n: number }) {
  return <span className="rounded-full bg-sun-soft px-2 text-sm text-ink tabular-nums">{n(v)}</span>;
}

// ---- Overview ----

function Overview({ s, m, days, href }: { s: Stats; m: More; days: number; href: (q: Query) => string }) {
  const f = s.funnel;
  const graded = total(s.scores);
  const todo = m.feedback.filter((x) => !x.handled_at);
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* The one big chart, on the night surface so it leads the page. */}
        <section className="rise flex min-w-0 flex-col gap-8 rounded-hero bg-night p-6 text-night-ink sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">Visitors per day</h2>
              <p className="text-sm text-night-muted">
                {n(s.views)} page views in the last {days} days
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-display font-semibold tabular-nums">{n(s.visitors)}</span>
              <Change value={s.visitors} prev={m.prev.visitors} dark />
            </div>
          </div>
          <Bars dark unit="visitors" days={s.by_day} pick={(d) => d.visitors} height="h-56" />
        </section>

        <section className="rise flex min-w-0 flex-col rounded-hero bg-paper p-6 [--d:80ms] sm:p-8">
          <h2 className="text-xl font-semibold">Key numbers</h2>
          <p className="text-sm text-muted">Against the {days} days before</p>
          <dl className="mt-4 flex flex-col">
            {(
              [
                ["New users", s.users_new, m.prev.users_new, `${n(s.users_total)} in total`],
                ["Active users", s.active, m.prev.active, `${n(s.active_7d)} this week`],
                ["Recaps graded", s.recaps, m.prev.recaps, `${n(s.videos_opened)} videos opened`],
                ["Average score", s.avg_score, m.prev.avg_score, s.avg_notes === null ? "no notes yet" : `${s.avg_notes} notes per video`],
              ] as const
            ).map(([label, v, prev, note], i) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-line py-4 last:border-0">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt>{label}</dt>
                  <dd className="truncate text-sm text-muted">{note}</dd>
                </div>
                <dd className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className={`text-2xl font-semibold tabular-nums ${i === 3 && v !== null ? scoreColor(v) : ""}`}>{v === null ? "–" : n(v)}</span>
                  <Change value={v} prev={prev} points={i === 3} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rise flex min-w-0 flex-col gap-5 rounded-hero bg-sun-soft p-6 [--d:120ms]">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">From sign-up to habit</h2>
            <p className="text-sm text-ink/70">People who signed up in the last {days} days</p>
          </div>
          <Meter
            fill="bg-ink"
            track="bg-paper/70"
            rows={[
              ["Signed up", f.signed_up, f.signed_up],
              ["Opened a video", f.opened, f.signed_up],
              ["Wrote a recap", f.recapped, f.signed_up],
              ["Came back another day", f.returned, f.signed_up],
            ]}
          />
        </section>

        <Surface title="How recaps score" sub={`${n(graded)} graded in the period`}>
          {graded ? (
            <Ring
              total={graded}
              parts={[
                ["85 and up", s.scores.great, 1],
                ["70 to 84", s.scores.good, 0.7],
                ["50 to 69", s.scores.mid, 0.45],
                ["Under 50", s.scores.low, 0.22],
              ]}
            />
          ) : (
            <Empty title="No graded recaps yet." hint="Scores show up here once people finish a video and write what they remember." />
          )}
        </Surface>

        <Surface title="Growth" sub="Sign-ups and videos opened per day">
          <div className="flex flex-col gap-6">
            <Mini label="Sign-ups" total={s.users_new}>
              <Bars unit="sign-ups" days={s.by_day} pick={(d) => d.signups} height="h-16" bare />
            </Mini>
            <Mini label="Videos opened" total={s.videos_opened}>
              <Bars unit="videos" days={s.by_day} pick={(d) => d.videos} height="h-16" bare />
            </Mini>
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface title="Latest feedback" sub={todo.length ? `${n(todo.length)} still to handle` : "All handled"} more={href({ tab: "feedback", sort: "", show: "" })}>
          {todo.length ? (
            <ul className="flex flex-col">
              {todo.slice(0, 3).map((x) => (
                <li key={x.id} className="flex flex-col gap-1 border-b border-line py-3 last:border-0">
                  <p className="line-clamp-2 leading-normal break-words">{x.message}</p>
                  <p className="truncate text-sm text-muted">
                    {when(x.at)} · {x.page ?? "unknown page"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="All caught up." hint="New messages from the Feedback button land here first." />
          )}
        </Surface>
        <Surface title="Latest issues" sub={`${n(s.grading_errors)} grading, ${n(s.client_errors)} in the app`} more={href({ tab: "issues", sort: "", show: "" })}>
          {s.issues.length ? (
            <ul className="flex flex-col">
              {s.issues.slice(0, 3).map((i, k) => (
                <li key={k} className="flex flex-col gap-1 border-b border-line py-3 last:border-0">
                  <p className="line-clamp-2 leading-normal break-words">{i.detail ?? "No message"}</p>
                  <p className="flex min-w-0 gap-2 text-sm text-muted">
                    <span className={`shrink-0 rounded-full px-2 ${i.kind === "grading" ? "bg-sun-soft text-ink" : "bg-bad-soft text-bad"}`}>
                      {i.kind === "grading" ? "Grading" : "App error"}
                    </span>
                    <span className="truncate">{i.place}</span>
                    <span className="ml-auto shrink-0">{when(i.at)}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Nothing went wrong in this period." hint="Failed gradings and app errors will show up here." />
          )}
        </Surface>
      </div>
    </>
  );
}

// The change against the period before: ↑/↓ and a percent (or points, for the score). The arrow carries the
// direction, so it never relies on color alone.
function Change({ value, prev, points, dark }: { value: number | null; prev: number | null; points?: boolean; dark?: boolean }) {
  const muted = dark ? "text-night-muted" : "text-muted";
  const [up, down] = dark ? ["text-good-n", "text-bad-n"] : ["text-good", "text-bad"];
  if (value === null || prev === null) return <span className={`text-sm ${muted}`}>no earlier data</span>;
  if (!points && prev === 0) return value ? <span className={`text-sm ${up}`}>↑ new</span> : <span className={`text-sm ${muted}`}>none before either</span>;
  const diff = points ? value - prev : Math.round(((value - prev) / prev) * 100);
  if (!diff) return <span className={`text-sm ${muted}`}>same as before</span>;
  return (
    <span className={`text-sm tabular-nums ${diff > 0 ? up : down}`}>
      {diff > 0 ? "↑" : "↓"} {Math.abs(diff)}
      {points ? " pts" : "%"}
    </span>
  );
}

function Mini({ label, total: t, children }: { label: string; total: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-muted">{label}</span>
        <span className="font-semibold tabular-nums">{n(t)}</span>
      </p>
      {children}
    </div>
  );
}

// ---- Users ----

const SORTS = {
  joined: ["Signed up", (u: User) => u.joined],
  active: ["Last active", (u: User) => u.active ?? ""],
  videos: ["Videos", (u: User) => u.videos],
  score: ["Avg. score", (u: User) => u.score ?? -1],
} as const;

function Users({ s, users, sort, href }: { s: Stats; users: User[]; sort?: string; href: (q: Query) => string }) {
  const by = sort && sort in SORTS ? (sort as keyof typeof SORTS) : "joined";
  const key = SORTS[by][1];
  const rows = [...users].sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0));
  return (
    <>
      <p className="max-w-[640px] leading-normal text-muted">
        {n(s.users_total)} {s.users_total === 1 ? "user" : "users"}, {n(s.active_7d)} active this week ({pct(s.active_7d, s.users_total)}). {n(s.folder_users)} {s.folder_users === 1 ? "uses" : "use"} folders. Signed in with{" "}
        {s.providers.map((p) => `${p.name} (${n(p.n)})`).join(", ") || "nothing yet"}.
      </p>
      <Surface title="Everyone" sub="Newest first. Click a column to sort by it, highest first.">
        {rows.length ? (
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[640px] text-left tabular-nums">
              <thead className="text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 font-normal">Email</th>
                  <th className="py-2 font-normal">Sign-in</th>
                  {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((k) => (
                    <th key={k} aria-sort={k === by ? "descending" : undefined} className="py-2 text-right font-normal">
                      <Link href={href({ sort: k })} className={`transition-colors hover:text-ink ${k === by ? "font-semibold text-ink" : ""}`}>
                        {SORTS[k][0]}
                        {k === by && " ↓"}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u, i) => (
                  <tr key={u.email ?? i} className="border-b border-line last:border-0">
                    <td className="max-w-[240px] truncate py-3" title={u.email ?? undefined}>{u.email ?? "no email"}</td>
                    <td className="py-3 text-muted">{u.provider}</td>
                    <td className="py-3 text-right">{day(u.joined)}</td>
                    <td className="py-3 text-right">{u.active ? day(u.active) : <span className="text-muted">never</span>}</td>
                    <td className="py-3 text-right">{n(u.videos)}</td>
                    <td className={`py-3 text-right ${u.score === null ? "text-muted" : scoreColor(u.score)}`}>{u.score ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No one has signed up yet." hint="Users appear here the moment they first sign in." />
        )}
      </Surface>
    </>
  );
}

// ---- Traffic ----

function Traffic({ s }: { s: Stats }) {
  return (
    <>
      <section className="rise flex min-w-0 flex-col gap-8 rounded-hero bg-night p-6 text-night-ink sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Page views per day</h2>
          <p className="text-sm text-night-muted">
            {n(s.views)} views from {n(s.visitors)} visitors
          </p>
        </div>
        <Bars dark unit="views" days={s.by_day} pick={(d) => d.views} height="h-48" />
      </section>
      <div className="grid gap-8 lg:grid-cols-2">
        <Surface title="Most opened pages" sub="Counted in visits">
          <Top rows={s.top_pages.map((p) => [p.path, p.n])} empty="No page views yet." />
        </Surface>
        <Surface title="Where visitors come from" sub="Counted in visits">
          <Top rows={s.top_referrers.map((r) => [r.host, r.n])} empty="No links from other sites yet." />
        </Surface>
      </div>
    </>
  );
}

// ---- Content ----

function Content({ s }: { s: Stats }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <Surface title="Most watched videos" sub="Counted in people">
        <Top rows={s.top_videos.map((v) => [v.title ?? v.video_id, v.n])} empty="No videos yet." />
      </Surface>
      <Surface title="Habits">
        <dl className="flex flex-col">
          {[
            ["Videos opened", n(s.videos_opened)],
            ["Recaps graded", n(s.recaps)],
            ["Notes per video", s.avg_notes === null ? "–" : String(s.avg_notes)],
            ["Average score", s.avg_score === null ? "–" : String(s.avg_score)],
          ].map(([label, v]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-0">
              <dt className="text-muted">{label}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Surface>
    </div>
  );
}

// ---- Issues ----

function Filter({ options, show, href }: { options: [string, string, number][]; show: string; href: (q: Query) => string }) {
  return (
    <nav aria-label="Filter" className="flex flex-wrap gap-2">
      {options.map(([v, label, count]) => (
        <Link
          key={v}
          href={href({ show: v })}
          aria-current={v === show || undefined}
          className="rounded-full bg-paper px-4 py-1.5 text-sm transition-colors hover:bg-line aria-[current]:bg-ink aria-[current]:text-paper"
        >
          {label} <span className="tabular-nums opacity-70">{n(count)}</span>
        </Link>
      ))}
    </nav>
  );
}

function Issues({ s, show = "all", href }: { s: Stats; show?: string; href: (q: Query) => string }) {
  const rows = s.issues.filter((i) => show === "all" || i.kind === show);
  return (
    <>
      <Filter
        show={show}
        href={href}
        options={[
          ["all", "All", s.issues.length],
          ["grading", "Grading", s.issues.filter((i) => i.kind === "grading").length],
          ["client", "App errors", s.issues.filter((i) => i.kind === "client").length],
        ]}
      />
      <Surface title="Issues" sub="Recaps that couldn't be graded and errors people hit in the app, newest first. The latest 15 of each.">
        {rows.length ? (
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[640px] text-left">
              <thead className="text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 font-normal">When</th>
                  <th className="py-2 font-normal">Kind</th>
                  <th className="py-2 font-normal">Where</th>
                  <th className="py-2 font-normal">Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i, k) => (
                  <tr key={k} className="border-b border-line align-top last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap text-muted tabular-nums">{when(i.at)}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className={`rounded-full px-2 text-sm ${i.kind === "grading" ? "bg-sun-soft text-ink" : "bg-bad-soft text-bad"}`}>
                        {i.kind === "grading" ? "Grading" : "App error"}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate py-3 pr-4" title={i.place}>{i.place}</td>
                    <td className="py-3 leading-normal break-words">{i.detail ?? "No message"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing went wrong in this period." hint="Failed gradings and app errors will show up here, newest first." />
        )}
      </Surface>
    </>
  );
}

// ---- Feedback ----

function FeedbackList({ notes, show = "open", href }: { notes: Note[]; show?: string; href: (q: Query) => string }) {
  const done = notes.filter((f) => f.handled_at).length;
  const rows = notes.filter((f) => show === "all" || (show === "handled" ? f.handled_at : !f.handled_at));
  return (
    <>
      <Filter
        show={show}
        href={href}
        options={[
          ["open", "To do", notes.length - done],
          ["handled", "Handled", done],
          ["all", "All", notes.length],
        ]}
      />
      <Surface title="What people asked for" sub="Messages from the Feedback button, newest first.">
        {rows.length ? (
          <ul className="flex flex-col">
            {rows.map((f) => (
              <li key={f.id} className="flex flex-wrap items-start gap-x-6 gap-y-2 border-b border-line py-4 last:border-0">
                <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
                  <p className={`leading-normal break-words ${f.handled_at ? "text-muted" : ""}`}>{f.message}</p>
                  <p className="flex min-w-0 gap-2 text-sm text-muted">
                    <span className="truncate">{f.page ?? "unknown page"}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{f.signed_in ? "signed in" : "signed out"}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0 tabular-nums">{when(f.at)}</span>
                  </p>
                </div>
                <form action={markFeedback.bind(null, f.id, !f.handled_at)}>
                  <button className={`${f.handled_at ? "btn-outline" : "btn"} min-h-9 px-4 text-sm`}>
                    {f.handled_at ? "Reopen" : "Mark as handled"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : show === "open" && notes.length ? (
          <Empty title="All caught up." hint="Every message has been handled. New ones land here first." />
        ) : (
          <Empty title="No feedback yet." hint="Messages sent with the Feedback button in the corner of every page land here." />
        )}
      </Surface>
    </>
  );
}

// ---- Pieces ----

function Surface({ title, sub, more, children }: { title: string; sub?: string; more?: string; children: React.ReactNode }) {
  return (
    <section className="rise flex min-w-0 flex-col gap-5 rounded-hero bg-paper p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          {sub && <p className="text-sm text-muted">{sub}</p>}
        </div>
        {more && (
          <Link href={more} className="shrink-0 rounded-full bg-canvas px-3 py-1.5 text-sm transition-colors hover:bg-ink hover:text-paper">
            See all
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-media bg-canvas px-5 py-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted">{hint}</p>
    </div>
  );
}

// One series per chart (never two scales on one), columns growing from one baseline with a 2px gap. The busiest day
// is picked out and labeled; hovering any day shows its value, and the table under it has every number. `dark` is
// for the night surface; `bare` drops the axis labels and table for the small charts.
function Bars({ unit, days, pick, height, dark, bare }: { unit: string; days: Day[]; pick: (d: Day) => number; height: string; dark?: boolean; bare?: boolean }) {
  const values = days.map(pick);
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));
  const [bar, top, line, muted, tip] = dark
    ? ["bg-sky-2/80", "bg-sun", "border-night-2", "text-night-muted", "bg-paper text-ink"]
    : ["bg-sky-2", "bg-link", "border-line", "text-muted", "bg-ink text-paper"];
  return (
    <div className="flex flex-col gap-3">
      <div className={`relative ${bare ? "" : "pt-8"}`}>
        <div className={`flex ${height} items-end gap-[2px] border-b ${line}`}>
          {days.map((d, i) => (
            <div key={d.d} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className={`relative w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-80 ${i === peak && values[i] ? top : bar}`}
                style={{ height: values[i] ? `${Math.max(3, (values[i] / max) * 100)}%` : 0 }}
              >
                {!bare && i === peak && values[i] > 0 && (
                  <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-full bg-sun px-2 text-sm font-semibold whitespace-nowrap text-ink tabular-nums group-hover:hidden">
                    {n(values[i])}
                  </span>
                )}
              </div>
              <span className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-media px-3 py-2 text-sm whitespace-nowrap group-hover:block ${tip}`}>
                {day(d.d)}: <span className="font-semibold tabular-nums">{n(values[i])}</span> {unit}
              </span>
            </div>
          ))}
        </div>
        <div className={`mt-2 flex justify-between text-sm ${muted}`}>
          <span>{day(days[0].d)}</span>
          {!bare && peak >= 0 && values[peak] > 0 && <span>Busiest: {day(days[peak].d)}</span>}
          <span>{day(days[days.length - 1].d)}</span>
        </div>
      </div>
      {!bare && (
        <details className="text-sm">
          <summary className={`cursor-pointer transition-colors ${muted} ${dark ? "hover:text-night-ink" : "hover:text-ink"}`}>Show as a table</summary>
          <table className="mt-2 w-full tabular-nums">
            <tbody>
              {days.map((d, i) => (
                <tr key={d.d} className={`border-b ${line}`}>
                  <td className={`py-1 ${muted}`}>{day(d.d)}</td>
                  <td className="py-1 text-right">{n(values[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

// Score bands as one ring in a single hue, darker for higher scores (ordered, so sequential), with a 2px gap between
// segments and a legend that carries every number.
function Ring({ parts, total: t }: { parts: [string, number, number][]; total: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const lens = parts.map(([, v]) => (v / t) * c);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((x, y) => x + y, 0));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90 text-link" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" className="stroke-panel" />
          {parts.map(([label, v, o], i) =>
            v ? (
              <circle key={label} cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity={o} strokeWidth="12"
                strokeDasharray={`${Math.max(0, lens[i] - 2)} ${c}`} strokeDashoffset={-starts[i]} />
            ) : null,
          )}
        </svg>
        <span className="absolute inset-0 grid place-items-center text-center">
          <span className="flex flex-col">
            <span className="text-2xl font-semibold tabular-nums">{n(t)}</span>
            <span className="text-sm text-muted">recaps</span>
          </span>
        </span>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {parts.map(([label, v, o]) => (
          <li key={label} className="flex items-center gap-3">
            <span aria-hidden className="size-3 shrink-0 rounded-full bg-link" style={{ opacity: o }} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="font-semibold tabular-nums">{n(v)}</span>
            <span className="w-10 text-right text-sm text-muted tabular-nums">{pct(v, t)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Horizontal bars against a shared whole: a funnel step or a share of recaps.
function Meter({ rows, fill = "bg-link", track = "bg-panel" }: { rows: [string, number, number][]; fill?: string; track?: string }) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map(([label, v, whole]) => (
        <li key={label} className="flex flex-col gap-2">
          <span className="flex justify-between gap-4">
            <span>{label}</span>
            <span className="tabular-nums">
              <span className="font-semibold">{n(v)}</span> <span className="opacity-70">{pct(v, whole)}</span>
            </span>
          </span>
          <span className={`block h-3 rounded-full ${track}`}>
            <span className={`block h-full rounded-full ${fill}`} style={{ width: whole ? `${(v / whole) * 100}%` : 0 }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Top({ rows, empty }: { rows: [string, number][]; empty: string }) {
  if (!rows.length) return <Empty title={empty} hint="This fills in as people use the site." />;
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <ol className="flex flex-col">
      {rows.map(([label, v]) => (
        <li key={label} className="relative flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
          {/* A faint bar behind each row, so the list reads as a ranking at a glance. */}
          <span aria-hidden className="absolute inset-y-1 left-0 rounded-[4px] bg-sky/60" style={{ width: `${(v / max) * 100}%` }} />
          <span className="relative min-w-0 truncate pl-2" title={label}>{label}</span>
          <span className="relative shrink-0 pr-2 font-semibold tabular-nums">{n(v)}</span>
        </li>
      ))}
    </ol>
  );
}
