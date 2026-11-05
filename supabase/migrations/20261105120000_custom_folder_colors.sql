-- Folder colors can also be any color from the color wheel, stored as #rrggbb.
alter table public.folders drop constraint if exists folders_color_check;
alter table public.folders add constraint folders_color_check
  check (color in ('blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'graphite') or color ~ '^#[0-9a-f]{6}$');
