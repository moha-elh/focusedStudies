-- Run in Supabase: Dashboard → SQL Editor → paste → Run. Safe to re-run; also upgrades a table made before accounts.
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  title text,
  recap text not null,
  feedback jsonb,
  notes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  -- Sort key for the library: most recently saved first.
  last_active timestamptz generated always as (coalesce(updated_at, created_at)) stored
);
create index if not exists sessions_last_active on public.sessions (last_active desc);

-- Accounts: each row belongs to the user who saved it. The database fills it in from the login token, so the app can't spoof it.
alter table public.sessions add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
-- One entry per video per user (was one per video before accounts).
alter table public.sessions drop constraint if exists sessions_video_id_key;
create unique index if not exists sessions_user_video on public.sessions (user_id, video_id);

-- Row-level security: a signed-in user can only see and change their own rows. Signed-out requests see nothing.
alter table public.sessions enable row level security;
drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Feedback from the in-app "Feedback" button. Anyone can send (signed in or not); nobody can read it back through
-- the app. Read it in the Supabase dashboard: Table Editor → feedback.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  message text not null check (char_length(message) between 1 and 2000),
  page text check (char_length(page) <= 200),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "anyone can send feedback" on public.feedback;
create policy "anyone can send feedback" on public.feedback for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
