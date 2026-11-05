-- Admin dashboard: who's an admin, anonymous page-view/error events, and one locked-down stats function.

-- Admins: add yourself once, in the SQL Editor (production) after signing in:
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
-- Row-level security is on with no policies, so nobody can read or change this table through the app.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- Page views and client errors. Anyone can add one (that's how signed-out traffic is counted); nobody can read them
-- back through the app. visitor is a random id from a first-party cookie, not a person.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  visitor text not null check (char_length(visitor) between 8 and 64),
  name text not null check (name in ('page_view', 'client_error')),
  path text not null check (char_length(path) <= 200),
  referrer text check (char_length(referrer) <= 200),
  detail text check (char_length(detail) <= 500)
);
create index if not exists events_name_at on public.events (name, at desc);
alter table public.events enable row level security;
drop policy if exists "anyone can add events" on public.events;
create policy "anyone can add events" on public.events for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- Every number on /admin, in one call. Runs with the owner's rights (to count auth.users and everyone's sessions),
-- so it checks first that the caller is in admins; anyone else gets an error, never data.
create or replace function public.admin_stats(period int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(1, least(period, 365)) - 1);
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'since', since,
    'users_total', (select count(*) from auth.users),
    'users_new', (select count(*) from auth.users where created_at >= since),
    -- Signed in and did something: viewed a page or saved a video.
    'active_7d', (select count(distinct u) from (
      select user_id u from public.events where user_id is not null and at >= now() - interval '7 days'
      union all select user_id from public.sessions where coalesce(updated_at, created_at) >= now() - interval '7 days') a),
    'active', (select count(distinct u) from (
      select user_id u from public.events where user_id is not null and at >= since
      union all select user_id from public.sessions where coalesce(updated_at, created_at) >= since) a),
    'visitors', (select count(distinct visitor) from public.events where name = 'page_view' and at >= since),
    'views', (select count(*) from public.events where name = 'page_view' and at >= since),
    'videos_opened', (select count(*) from public.sessions where created_at >= since),
    'recaps', (select count(*) from public.sessions where recap <> '' and coalesce(updated_at, created_at) >= since),
    'avg_score', (select round(avg((feedback ->> 'score')::numeric)) from public.sessions
      where jsonb_typeof(feedback -> 'score') = 'number' and coalesce(updated_at, created_at) >= since),
    'avg_notes', (select round(avg(jsonb_array_length(notes)), 1) from public.sessions where created_at >= since),
    'folder_users', (select count(distinct user_id) from public.sessions where folder is not null),

    'by_day', (select jsonb_agg(jsonb_build_object('d', d::date, 'views', coalesce(v.views, 0), 'visitors', coalesce(v.visitors, 0),
        'signups', coalesce(s.n, 0), 'videos', coalesce(o.n, 0)) order by d)
      from generate_series(since, date_trunc('day', now()), interval '1 day') d
      left join (select date_trunc('day', at) as dd, count(*) views, count(distinct visitor) visitors
        from public.events where name = 'page_view' and at >= since group by 1) v on v.dd = d
      left join (select date_trunc('day', created_at) as dd, count(*) n from auth.users where created_at >= since group by 1) s on s.dd = d
      left join (select date_trunc('day', created_at) as dd, count(*) n from public.sessions where created_at >= since group by 1) o on o.dd = d),

    -- People who signed up in the period, and how far they got.
    'funnel', (select jsonb_build_object(
        'signed_up', count(*),
        'opened', count(*) filter (where exists (select 1 from public.sessions s where s.user_id = u.id)),
        'recapped', count(*) filter (where exists (select 1 from public.sessions s where s.user_id = u.id and s.recap <> '')),
        'returned', count(*) filter (where (select count(distinct date_trunc('day', coalesce(s.updated_at, s.created_at)))
          from public.sessions s where s.user_id = u.id) >= 2))
      from auth.users u where u.created_at >= since),

    'scores', (select jsonb_build_object(
        'low', count(*) filter (where sc < 50), 'mid', count(*) filter (where sc >= 50 and sc < 70),
        'good', count(*) filter (where sc >= 70 and sc < 85), 'great', count(*) filter (where sc >= 85))
      from (select (feedback ->> 'score')::numeric sc from public.sessions
        where jsonb_typeof(feedback -> 'score') = 'number' and coalesce(updated_at, created_at) >= since) x),

    'providers', (select coalesce(jsonb_agg(jsonb_build_object('name', p, 'n', n) order by n desc), '[]')
      from (select coalesce(raw_app_meta_data ->> 'provider', 'unknown') p, count(*) n from auth.users group by 1) x),
    'top_pages', (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'n', n) order by n desc), '[]')
      from (select path, count(*) n from public.events where name = 'page_view' and at >= since group by 1 order by 2 desc limit 8) x),
    'top_referrers', (select coalesce(jsonb_agg(jsonb_build_object('host', referrer, 'n', n) order by n desc), '[]')
      from (select referrer, count(*) n from public.events
        where name = 'page_view' and referrer is not null and at >= since group by 1 order by 2 desc limit 8) x),
    'top_videos', (select coalesce(jsonb_agg(jsonb_build_object('video_id', video_id, 'title', title, 'n', n) order by n desc), '[]')
      from (select video_id, max(title) title, count(distinct user_id) n from public.sessions
        where coalesce(updated_at, created_at) >= since group by 1 order by 3 desc limit 8) x),

    'grading_errors', (select count(*) from public.sessions where feedback ? 'error' and coalesce(updated_at, created_at) >= since),
    'client_errors', (select count(*) from public.events where name = 'client_error' and at >= since),
    'issues', (select coalesce(jsonb_agg(x order by x.at desc), '[]') from (
      (select 'grading' kind, coalesce(updated_at, created_at) at, feedback ->> 'error' detail, coalesce(title, video_id) place
        from public.sessions where feedback ? 'error' and coalesce(updated_at, created_at) >= since
        order by 2 desc limit 15)
      union all
      (select 'client', at, detail, path from public.events where name = 'client_error' and at >= since order by at desc limit 15)) x),
    'feedback', (select coalesce(jsonb_agg(x order by x.at desc), '[]') from (
      select message, page, created_at at, user_id is not null signed_in from public.feedback
      order by created_at desc limit 20) x)
  );
end;
$$;

revoke all on function public.admin_stats(int) from public, anon;
grant execute on function public.admin_stats(int) to authenticated;
