-- Folder colors (the macOS tag colors). null = blue, the default. A folder that only lived on its videos gets a
-- row here the first time its color is changed.
alter table public.folders add column if not exists color text
  check (color in ('blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'graphite'));
