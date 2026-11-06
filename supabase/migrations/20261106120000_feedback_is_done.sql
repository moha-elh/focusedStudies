-- "isDone" was added to feedback by hand in the production dashboard. This makes local match (no-op in production)
-- and folds it into handled_at, which the admin page already uses: isDone = true rows show as handled (no
-- "Mark as handled" button), and the button keeps both columns in step from now on.
alter table public.feedback add column if not exists "isDone" boolean not null default false;

update public.feedback set handled_at = coalesce(handled_at, created_at) where "isDone";
update public.feedback set "isDone" = true where handled_at is not null;

create or replace function public.admin_handle_feedback(fid uuid, handled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.feedback set handled_at = case when handled then now() end, "isDone" = handled where id = fid;
end;
$$;
revoke all on function public.admin_handle_feedback(uuid, boolean) from public, anon;
grant execute on function public.admin_handle_feedback(uuid, boolean) to authenticated;
