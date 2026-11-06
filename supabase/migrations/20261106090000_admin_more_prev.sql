-- More numbers for the period before, so the admin KPIs (recap rate, videos per active user, grading failures)
-- can show their change too. Same function as in 20261105180000_admin_dashboard.sql, with three more 'prev' fields.

create or replace function public.admin_more(period int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  len interval := make_interval(days => greatest(1, least(period, 365)));
  since timestamptz := date_trunc('day', now()) - len + interval '1 day';
  prev timestamptz := since - len;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    -- The same numbers as admin_stats() for the period before this one, for the ↑/↓ on the headline row.
    'prev', jsonb_build_object(
      'visitors', (select count(distinct visitor) from public.events where name = 'page_view' and at >= prev and at < since),
      'users_new', (select count(*) from auth.users where created_at >= prev and created_at < since),
      'active', (select count(distinct u) from (
        select user_id u from public.events where user_id is not null and at >= prev and at < since
        union all select user_id from public.sessions where last_active >= prev and last_active < since) a),
      'recaps', (select count(*) from public.sessions where recap <> '' and last_active >= prev and last_active < since),
      'avg_score', (select round(avg((feedback ->> 'score')::numeric)) from public.sessions
        where jsonb_typeof(feedback -> 'score') = 'number' and last_active >= prev and last_active < since),
      'views', (select count(*) from public.events where name = 'page_view' and at >= prev and at < since),
      'videos_opened', (select count(*) from public.sessions where created_at >= prev and created_at < since),
      'grading_errors', (select count(*) from public.sessions where feedback ? 'error' and last_active >= prev and last_active < since)),

    -- ponytail: newest 500 users; page it when there are more.
    'users', (select coalesce(jsonb_agg(x order by x.joined desc), '[]') from (
      select u.email, u.created_at joined, coalesce(u.raw_app_meta_data ->> 'provider', 'unknown') provider,
        greatest((select max(at) from public.events e where e.user_id = u.id),
                 (select max(last_active) from public.sessions s where s.user_id = u.id)) active,
        (select count(*) from public.sessions s where s.user_id = u.id) videos,
        (select round(avg((s.feedback ->> 'score')::numeric)) from public.sessions s
          where s.user_id = u.id and jsonb_typeof(s.feedback -> 'score') = 'number') score
      from auth.users u order by u.created_at desc limit 500) x),

    'feedback', (select coalesce(jsonb_agg(x order by x.at desc), '[]') from (
      select id, message, page, created_at at, user_id is not null signed_in, handled_at
      from public.feedback order by created_at desc limit 200) x)
  );
end;
$$;
revoke all on function public.admin_more(int) from public, anon;
grant execute on function public.admin_more(int) to authenticated;
