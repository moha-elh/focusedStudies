-- Folders inside folders: a folder can name its parent (null = top level). Names stay unique per user, so videos
-- keep pointing at their folder by name. A folder is only ever made inside an existing one, so there are no loops.
alter table public.folders add column if not exists parent text;
alter table public.folders drop constraint if exists folders_parent_fkey;
alter table public.folders add constraint folders_parent_fkey
  foreign key (user_id, parent) references public.folders (user_id, name) on delete set null (parent);
alter table public.folders drop constraint if exists folders_parent_not_self;
alter table public.folders add constraint folders_parent_not_self check (parent <> name);
