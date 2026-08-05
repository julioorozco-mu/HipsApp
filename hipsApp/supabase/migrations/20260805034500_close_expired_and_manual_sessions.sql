create extension if not exists pg_cron;

alter table public.class_sessions
  add column if not exists closure_mode text,
  add column if not exists closure_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'class_sessions_closure_mode_check'
      and conrelid = 'public.class_sessions'::regclass
  ) then
    alter table public.class_sessions
      add constraint class_sessions_closure_mode_check
      check (closure_mode is null or closure_mode in ('completed', 'automatic', 'manual'));
  end if;
end;
$$;

update public.class_sessions
set closure_mode = case
  when closure_mode is not null then closure_mode
  when status = 'completada' and finished_by is null then 'automatic'
  when status = 'completada' then 'completed'
  else null
end
where status = 'completada';

create or replace view public.session_overview
with (security_invoker = true)
as
select
  session.id,
  session.class_id,
  class.name as class_name,
  session.instructor_id,
  session.starts_at,
  session.status,
  session.attendance_saved_at,
  session.finished_at,
  session.playlist_url,
  count(*) filter (where attendance.status = 'presente'::public.attendance_status) as present_count,
  count(*) filter (where attendance.status = 'ausente'::public.attendance_status) as absent_count,
  session.started_at,
  session.finished_by,
  session.notes,
  session.closure_mode,
  session.closure_reason
from public.class_sessions session
join public.classes class on class.id = session.class_id
left join public.attendance attendance on attendance.session_id = session.id
group by session.id, class.id;

create or replace function public.finish_class_session(
  p_session_id uuid,
  p_playlist_url text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_role public.staff_role;
  v_session public.class_sessions;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;

  select role into v_role
  from public.profiles
  where id = v_actor;

  if v_role not in (
    'superadmin'::public.staff_role,
    'admin'::public.staff_role,
    'instructor'::public.staff_role
  ) then
    raise exception 'operational role required';
  end if;

  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'closing notes too long';
  end if;

  select * into v_session
  from public.class_sessions
  where id = p_session_id
  for update;

  if v_session.id is null then
    raise exception 'class session not found';
  end if;

  if v_session.status = 'completada' then
    update public.class_sessions
    set
      playlist_url = coalesce(nullif(trim(p_playlist_url), ''), playlist_url),
      notes = coalesce(v_notes, notes),
      closure_reason = coalesce(v_notes, closure_reason),
      finished_by = coalesce(finished_by, v_actor)
    where id = p_session_id;
    return;
  end if;

  if v_session.status = 'cancelada' or v_session.attendance_saved_at is null then
    raise exception 'attendance must be saved before finishing the class';
  end if;

  if now() < v_session.starts_at then
    raise exception 'class has not started';
  end if;

  update public.class_sessions
  set
    status = 'completada',
    started_at = coalesce(started_at, starts_at),
    finished_at = now(),
    finished_by = v_actor,
    playlist_url = coalesce(nullif(trim(p_playlist_url), ''), playlist_url),
    notes = v_notes,
    closure_mode = 'completed',
    closure_reason = v_notes
  where id = p_session_id;

  update public.profiles
  set
    current_class_streak = current_class_streak + 1,
    highest_class_streak = greatest(highest_class_streak, current_class_streak + 1),
    updated_at = now()
  where id = v_session.instructor_id;
end;
$function$;

create or replace function public.close_class_session_manually(
  p_session_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_role public.staff_role;
  v_session public.class_sessions;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;

  select role into v_role
  from public.profiles
  where id = v_actor;

  if v_role not in (
    'superadmin'::public.staff_role,
    'admin'::public.staff_role,
    'instructor'::public.staff_role
  ) then
    raise exception 'operational role required';
  end if;

  if v_reason is null or char_length(v_reason) < 5 then
    raise exception 'manual close reason required';
  end if;

  if char_length(v_reason) > 300 then
    raise exception 'manual close reason too long';
  end if;

  select * into v_session
  from public.class_sessions
  where id = p_session_id
  for update;

  if v_session.id is null then
    raise exception 'class session not found';
  end if;

  if v_session.status = 'completada' then
    return;
  end if;

  if v_session.status = 'cancelada' then
    raise exception 'class session is closed';
  end if;

  update public.class_sessions
  set
    status = 'completada',
    started_at = case
      when attendance_saved_at is not null then coalesce(started_at, starts_at)
      else started_at
    end,
    finished_at = now(),
    finished_by = v_actor,
    closure_mode = 'manual',
    closure_reason = v_reason,
    notes = coalesce(notes, v_reason)
  where id = p_session_id;

  if v_session.attendance_saved_at is not null and now() >= v_session.starts_at then
    update public.profiles
    set
      current_class_streak = current_class_streak + 1,
      highest_class_streak = greatest(highest_class_streak, current_class_streak + 1),
      updated_at = now()
    where id = v_session.instructor_id;
  end if;
end;
$function$;

create or replace function public.close_expired_class_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_closed integer := 0;
begin
  with due as (
    select
      session.id,
      session.instructor_id,
      session.attendance_saved_at,
      session.starts_at + make_interval(mins => class.duration_minutes) as ends_at
    from public.class_sessions session
    join public.classes class on class.id = session.class_id
    where session.status in ('programada', 'en_curso')
      and session.starts_at + make_interval(mins => class.duration_minutes) <= now()
    for update of session skip locked
  ),
  closed as (
    update public.class_sessions session
    set
      status = 'completada',
      started_at = case
        when due.attendance_saved_at is not null then coalesce(session.started_at, session.starts_at)
        else session.started_at
      end,
      finished_at = due.ends_at,
      finished_by = null,
      closure_mode = 'automatic',
      closure_reason = case
        when due.attendance_saved_at is not null then 'Horario finalizado automáticamente.'
        else 'Horario finalizado sin asistencia registrada.'
      end
    from due
    where session.id = due.id
    returning session.instructor_id, session.attendance_saved_at
  ),
  streaks as (
    select instructor_id, count(*)::integer as completed_count
    from closed
    where attendance_saved_at is not null
      and instructor_id is not null
    group by instructor_id
  ),
  updated_profiles as (
    update public.profiles profile
    set
      current_class_streak = profile.current_class_streak + streaks.completed_count,
      highest_class_streak = greatest(
        profile.highest_class_streak,
        profile.current_class_streak + streaks.completed_count
      ),
      updated_at = now()
    from streaks
    where profile.id = streaks.instructor_id
    returning profile.id
  )
  select count(*)::integer into v_closed from closed;

  return v_closed;
end;
$function$;

revoke execute on function public.finish_class_session(uuid, text, text) from public, anon;
revoke execute on function public.close_class_session_manually(uuid, text) from public, anon;
revoke execute on function public.close_expired_class_sessions() from public, anon;

grant execute on function public.finish_class_session(uuid, text, text) to authenticated;
grant execute on function public.close_class_session_manually(uuid, text) to authenticated;
grant execute on function public.close_expired_class_sessions() to authenticated, service_role;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'hipsapp-close-expired-class-sessions'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'hipsapp-close-expired-class-sessions',
    '* * * * *',
    'select public.close_expired_class_sessions();'
  );
end;
$$;

select public.close_expired_class_sessions();
