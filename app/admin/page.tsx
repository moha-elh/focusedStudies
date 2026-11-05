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
const TABS = [
  ["overview", "Overview"],
  ["users", "Users"],
  ["traffic", "Traffic"],
  ["content", "Content"],
  ["issues", "Issues"],
  ["feedback", "Feedback"],
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
    <main className="wrap flex flex-col pt-10 pb-24">
      <header className="rise flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Admin · since {day(s.since)}</p>
          <h1 className="text-display font-semibold">How FocusLearn is doing</h1>
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

      <nav aria-label="Sections" className="mt-8 flex gap-6 overflow-x-auto border-b border-line">
        {TABS.map(([t, label]) => (
          <Link
            key={t}
            href={href({ tab: t, sort: "", show: "" })}
            aria-current={t === tab ? "page" : undefined}
            className="-mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent py-3 text-muted transition-colors hover:text-ink aria-[current]:border-ink aria-[current]:font-semibold aria-[current]:text-ink"
          >
            {label}
            {t === "issues" && s.issues.length > 0 && <Count n={s.grading_errors + s.client_errors} />}
            {t === "feedback" && open > 0 && <Count n={open} />}
          </Link>
        ))}
      </nav>

      <div className="mt-10 flex flex-col gap-8">
        {tab === "overview" && <Overview s={s} m={m} days={days} />}
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

function Overview({ s, m, days }: { s: Stats; m: More; days: number }) {
  const f = s.funnel;
  return (
    <>
      {/* Four headline numbers, each against the period before. */}
      <dl className="rise grid overflow-hidden rounded-panel bg-paper sm:grid-cols-2 lg:grid-cols-4">
        <Hero label="Visitors" value={s.visitors} prev={m.prev.visitors} note={`${n(s.views)} page views`} />
        <Hero label="New users" value={s.users_new} prev={m.prev.users_new} note={`${n(s.users_total)} in total`} />
        <Hero label="Active users" value={s.active} prev={m.prev.active} note={`${n(s.active_7d)} this week`} />
        <Hero
          label="Average score"
          value={s.avg_score}
          prev={m.prev.avg_score}
          points
          tone={s.avg_score === null ? undefined : scoreColor(s.avg_score)}
          note={`${n(s.recaps)} recaps graded`}
        />
      </dl>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <Surface title="Visitors per day" sub={`Last ${days} days`}>
          <Bars unit="visitors" days={s.by_day} pick={(d) => d.visitors} height="h-64" />
        </Surface>
        <div className="flex flex-col gap-8">
          <Surface title="New users per day">
            <Bars unit="sign-ups" days={s.by_day} pick={(d) => d.signups} height="h-20" />
          </Surface>
          <Surface title="Videos opened per day">
            <Bars unit="videos" days={s.by_day} pick={(d) => d.videos} height="h-20" />
          </Surface>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Surface title="From sign-up to habit" sub={`People who signed up in the last ${days} days`}>
          <Meter
            rows={[
              ["Signed up", f.signed_up, f.signed_up],
              ["Opened a video", f.opened, f.signed_up],
              ["Wrote a recap", f.recapped, f.signed_up],
              ["Came back another day", f.returned, f.signed_up],
            ]}
          />
        </Surface>
        <Surface title="How recaps score" sub="Graded recaps in the period">
          <Meter
            rows={[
              ["85 and up", s.scores.great, total(s.scores)],
              ["70 to 84", s.scores.good, total(s.scores)],
              ["50 to 69", s.scores.mid, total(s.scores)],
              ["Under 50", s.scores.low, total(s.scores)],
            ]}
          />
        </Surface>
      </div>
    </>
  );
}

// A headline number with its change: ↑/↓ and a percent (or points, for the score). The arrow carries the direction,
// so it never relies on color alone.
function Hero({ label, value, prev, note, tone, points }: { label: string; value: number | null; prev: number | null; note: string; tone?: string; points?: boolean }) {
  let change: React.ReactNode = <span className="text-muted">no earlier data</span>;
  if (value !== null && prev !== null && (prev > 0 || points)) {
    const diff = points ? value - prev : Math.round(((value - prev) / prev) * 100);
    change =
      diff === 0 ? (
        <span className="text-muted">same as before</span>
      ) : (
        <span className={diff > 0 ? "text-good" : "text-bad"}>
          {diff > 0 ? "↑" : "↓"} {Math.abs(diff)}
          {points ? " pts" : "%"}
        </span>
      );
  } else if (value && prev === 0) change = <span className="text-good">↑ new</span>;
  return (
    <div className="flex flex-col gap-1 border-line p-6 max-lg:not-last:border-b lg:not-last:border-r">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-display font-semibold tabular-nums ${tone ?? ""}`}>{value === null ? "–" : n(value)}</dd>
      <dd className="flex flex-wrap gap-x-2 text-sm">
        {change}
        <span className="text-muted">· {note}</span>
      </dd>
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
      <Surface title="Page views per day" sub={`${n(s.views)} views from ${n(s.visitors)} visitors`}>
        <Bars unit="views" days={s.by_day} pick={(d) => d.views} height="h-48" />
      </Surface>
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

function Surface({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rise flex min-w-0 flex-col gap-5 rounded-panel bg-paper p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        {sub && <p className="text-sm text-muted">{sub}</p>}
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

// One series per chart (never two scales on one), columns growing from one baseline with a 2px gap. Hovering a day
// shows its value; the table under it has every number.
function Bars({ unit, days, pick, height }: { unit: string; days: Day[]; pick: (d: Day) => number; height: string }) {
  const values = days.map(pick);
  const max = Math.max(1, ...values);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative pt-6">
        <span className="absolute top-0 left-0 text-sm text-muted tabular-nums">{n(max)}</span>
        <div className={`flex ${height} items-end gap-[2px] border-b border-line`}>
          {days.map((d, i) => (
            <div key={d.d} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-link transition-opacity group-hover:opacity-80"
                style={{ height: values[i] ? `${Math.max(2, (values[i] / max) * 100)}%` : 0 }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-media bg-ink px-3 py-2 text-sm whitespace-nowrap text-paper group-hover:block">
                {day(d.d)}: <span className="font-semibold tabular-nums">{n(values[i])}</span> {unit}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-sm text-muted">
          <span>{day(days[0].d)}</span>
          <span>{day(days[days.length - 1].d)}</span>
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted transition-colors hover:text-ink">Show as a table</summary>
        <table className="mt-2 w-full tabular-nums">
          <tbody>
            {days.map((d, i) => (
              <tr key={d.d} className="border-b border-line">
                <td className="py-1 text-muted">{day(d.d)}</td>
                <td className="py-1 text-right">{n(values[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// Horizontal bars against a shared whole: a funnel step or a share of recaps.
function Meter({ rows }: { rows: [string, number, number][] }) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map(([label, v, whole]) => (
        <li key={label} className="flex flex-col gap-2">
          <span className="flex justify-between gap-4">
            <span>{label}</span>
            <span className="tabular-nums">
              <span className="font-semibold">{n(v)}</span> <span className="text-muted">{pct(v, whole)}</span>
            </span>
          </span>
          <span className="block h-3 rounded-full bg-panel">
            <span className="block h-full rounded-full bg-link" style={{ width: whole ? `${(v / whole) * 100}%` : 0 }} />
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
