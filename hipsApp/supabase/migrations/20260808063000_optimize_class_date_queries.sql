create index if not exists class_sessions_visible_starts_at_idx
  on public.class_sessions (starts_at)
  where status <> 'cancelada';
