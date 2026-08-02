create unique index if not exists class_sessions_class_start_key
  on public.class_sessions (class_id, starts_at);

create or replace function public.prevent_overlapping_classes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.active then
    return new;
  end if;

  if new.duration_minutes < 15 then
    raise exception using
      errcode = '23514',
      message = 'classes_invalid_duration';
  end if;

  if exists (
    select 1
    from public.classes existing
    where existing.active
      and existing.weekday = new.weekday
      and existing.id is distinct from new.id
      and new.start_time < existing.start_time + make_interval(mins => existing.duration_minutes)
      and new.start_time + make_interval(mins => new.duration_minutes) > existing.start_time
  ) then
    raise exception using
      errcode = '23P01',
      message = 'classes_time_overlap';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_overlapping_classes on public.classes;
create trigger prevent_overlapping_classes
before insert or update of weekday, start_time, duration_minutes, active
on public.classes
for each row
execute function public.prevent_overlapping_classes();

create or replace function public.ensure_daily_class_sessions(
  p_date date default ((now() at time zone 'America/Mexico_City')::date)
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role::text in ('superadmin', 'admin')
  ) then
    raise exception using errcode = '42501', message = 'staff_access_required';
  end if;

  delete from public.class_sessions session
  where (session.starts_at at time zone 'America/Mexico_City')::date = p_date
    and session.status = 'programada'
    and session.attendance_saved_at is null
    and not exists (
      select 1
      from public.classes class
      where class.id = session.class_id
        and class.active
        and class.weekday = extract(dow from p_date)::integer
        and session.starts_at = ((p_date + class.start_time) at time zone 'America/Mexico_City')
    );

  insert into public.class_sessions (
    class_id,
    instructor_id,
    starts_at,
    status
  )
  select
    class.id,
    class.instructor_id,
    ((p_date + class.start_time) at time zone 'America/Mexico_City'),
    'programada'::public.class_session_status
  from public.classes class
  where class.active
    and class.weekday = extract(dow from p_date)::integer
  on conflict (class_id, starts_at) do nothing;
end;
$$;

grant execute on function public.ensure_daily_class_sessions(date) to authenticated;
