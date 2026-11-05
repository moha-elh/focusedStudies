import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Label, scoreColor } from "../ui";

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
  feedback: { message: string; page: string | null; at: string; signed_in: boolean }[];
};

const RANGES = [7, 30, 90];
const n = (v: number) => v.toLocaleString("en-US");
const day = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const when = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");

// Only admins get here: the database's admin_stats() refuses everyone else (supabase/migrations), and then this is a
// plain 404, so the page doesn't even admit it exists. Signed-out visitors are sent to sign in by proxy.ts first.
export default async function Admin({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const want = Number((await searchParams).days);
  const days = RANGES.includes(want) ? want : 30;
  const { data, error } = await (await supabase()).rpc("admin_stats", { period: days });
  if (error || !data) notFound();
  const s = data as Stats;
  const f = s.funnel;

  return (
    <main className="wrap flex flex-col gap-16 pt-10 pb-24">
      <header className="rise flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-8">
        <div>
          <Label className="mb-4">Admin</Label>
          <h1 className="text-h1 font-semibold sm:text-hero">How FocusLearn is doing.</h1>
        </div>
        <nav aria-label="Period" className="flex gap-2">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin?days=${r}`}
              aria-current={r === days || undefined}
              className="rounded-full bg-paper px-4 py-2 text-sm transition-colors hover:bg-line aria-[current]:bg-ink aria-[current]:text-paper"
            >
              {r} days
            </Link>
          ))}
        </nav>
      </header>

      {/* The headline numbers. Everything except "Users" and "Active this week" is for the chosen period. */}
      <dl className="rise grid grid-cols-2 gap-x-8 gap-y-10 [--d:100ms] sm:grid-cols-4">
        <Stat label="Users" value={n(s.users_total)} note={`+${n(s.users_new)} new`} />
        <Stat label="Active this week" value={n(s.active_7d)} note={`${pct(s.active_7d, s.users_total)} of users`} />
        <Stat label="Visitors" value={n(s.visitors)} note={`${n(s.views)} page views`} />
        <Stat label="Average score" value={s.avg_score ?? "–"} tone={s.avg_score === null ? undefined : scoreColor(s.avg_score)} note={`${n(s.recaps)} recaps graded`} />
        <Stat label="Videos opened" value={n(s.videos_opened)} note={s.avg_notes === null ? "no notes yet" : `${s.avg_notes} notes each`} />
        <Stat label="Active in period" value={n(s.active)} note="signed-in people" />
        <Stat label="Use folders" value={n(s.folder_users)} note={`${pct(s.folder_users, s.users_total)} of users`} />
        <Stat label="Issues" value={n(s.grading_errors + s.client_errors)} tone={s.grading_errors + s.client_errors ? "text-bad" : undefined} note={`${n(s.grading_errors)} grading, ${n(s.client_errors)} app`} />
      </dl>

      <section className="grid gap-12 lg:grid-cols-3">
        <Bars title="Visitors per day" unit="visitors" days={s.by_day} pick={(d) => d.visitors} />
        <Bars title="New users per day" unit="sign-ups" days={s.by_day} pick={(d) => d.signups} />
        <Bars title="Videos opened per day" unit="videos" days={s.by_day} pick={(d) => d.videos} />
      </section>

      <section className="grid gap-12 lg:grid-cols-2">
        <Panel title="From sign-up to habit" sub={`People who signed up in the last ${days} days, and how far they got.`}>
          <Meter rows={[
            ["Signed up", f.signed_up, f.signed_up],
            ["Opened a video", f.opened, f.signed_up],
            ["Wrote a recap", f.recapped, f.signed_up],
            ["Came back another day", f.returned, f.signed_up],
          ]} />
        </Panel>
        <Panel title="How recaps score" sub="Graded recaps in the period, by score.">
          <Meter rows={[
            ["85 and up", s.scores.great, total(s.scores)],
            ["70 to 84", s.scores.good, total(s.scores)],
            ["50 to 69", s.scores.mid, total(s.scores)],
            ["Under 50", s.scores.low, total(s.scores)],
          ]} />
        </Panel>
      </section>

      <section className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
        <Top title="Most opened pages" rows={s.top_pages.map((p) => [p.path, p.n])} empty="No page views yet." />
        <Top title="Where visitors come from" rows={s.top_referrers.map((r) => [r.host, r.n])} empty="No links from other sites yet." />
        <Top title="Most watched videos" rows={s.top_videos.map((v) => [v.title ?? v.video_id, v.n])} unit="people" empty="No videos yet." />
        <Top title="Sign-in method" rows={s.providers.map((p) => [p.name, p.n])} unit="users" empty="No users yet." />
      </section>

      <section className="grid gap-12 lg:grid-cols-2">
        <Panel title="Issues" sub="Recaps that couldn't be graded and errors people hit in the app, newest first.">
          {s.issues.length ? (
            <ul className="flex flex-col">
              {s.issues.map((i, k) => (
                <li key={k} className="flex flex-col gap-1 border-b border-line py-3">
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <span className={`rounded-full px-2 ${i.kind === "grading" ? "bg-sun-soft text-ink" : "bg-bad-soft text-bad"}`}>
                      {i.kind === "grading" ? "Grading" : "App error"}
                    </span>
                    <span className="truncate">{i.place}</span>
                    <span className="ml-auto shrink-0">{when(i.at)}</span>
                  </span>
                  <span className="leading-normal break-words">{i.detail ?? "No message"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Nothing went wrong in this period.</p>
          )}
        </Panel>
        <Panel title="What people asked for" sub="The latest messages from the Feedback button.">
          {s.feedback.length ? (
            <ul className="flex flex-col">
              {s.feedback.map((m, k) => (
                <li key={k} className="flex flex-col gap-1 border-b border-line py-3">
                  <span className="leading-normal break-words">{m.message}</span>
                  <span className="flex gap-2 text-sm text-muted">
                    <span className="truncate">{m.page ?? "unknown page"}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{m.signed_in ? "signed in" : "signed out"}</span>
                    <span className="ml-auto shrink-0">{when(m.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No feedback yet.</p>
          )}
        </Panel>
      </section>
    </main>
  );
}

const total = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-display font-semibold tabular-nums ${tone ?? ""}`}>{value}</dd>
      <dd className="text-sm text-muted">{note}</dd>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}

// One series per chart (never two scales on one), columns growing from one baseline. Hovering a day shows its
// value; the table under it has every number.
function Bars({ title, unit, days, pick }: { title: string; unit: string; days: Day[]; pick: (d: Day) => number }) {
  const values = days.map(pick);
  const max = Math.max(1, ...values);
  return (
    <Panel title={title} sub={`Busiest day: ${n(Math.max(0, ...values))} ${unit}`}>
      <div className="relative pt-6">
        <span className="absolute top-0 left-0 text-sm text-muted tabular-nums">{n(max)}</span>
        <div className="flex h-40 items-end gap-[2px] border-b border-line pt-1">
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
    </Panel>
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

function Top({ title, rows, unit = "", empty }: { title: string; rows: [string, number][]; unit?: string; empty: string }) {
  return (
    <Panel title={title} sub={unit ? `Counted in ${unit}` : "Counted in visits"}>
      {rows.length ? (
        <ol className="flex flex-col">
          {rows.map(([label, v]) => (
            <li key={label} className="flex items-baseline justify-between gap-4 border-b border-line py-2">
              <span className="min-w-0 truncate" title={label}>{label}</span>
              <span className="shrink-0 font-semibold tabular-nums">{n(v)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted">{empty}</p>
      )}
    </Panel>
  );
}
