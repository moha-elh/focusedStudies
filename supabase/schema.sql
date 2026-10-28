-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique, -- one entry per video
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

-- RLS on with no policies: the public (anon) key can't touch this table.
-- Only the server, using the secret key, can read and write it.
alter table public.sessions enable row level security;
