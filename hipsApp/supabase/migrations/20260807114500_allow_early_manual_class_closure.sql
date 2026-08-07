alter table public.class_sessions
  drop constraint if exists class_sessions_check;

alter table public.class_sessions
  add constraint class_sessions_check
  check (
    finished_at is null
    or finished_at >= starts_at
    or (
      closure_mode = 'manual'
      and finished_by is not null
      and nullif(trim(coalesce(closure_reason, '')), '') is not null
    )
  );
