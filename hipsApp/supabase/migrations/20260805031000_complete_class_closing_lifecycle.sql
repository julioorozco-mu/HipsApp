alter table public.class_sessions
  add column if not exists started_at timestamptz,
  add column if not exists finished_by uuid references public.profiles(id) on delete set null;

update public.class_sessions
set started_at = greatest(starts_at, attendance_saved_at)
where started_at is null
  and attendance_saved_at is not null;

create index if not exists class_sessions_status_starts_at_idx
  on public.class_sessions(status, starts_at);

create or replace view public.session_overview
with (security_invoker = true)
as
select
  session.id,
  session.class_id,
  class.name as class_name,
  session.instructor_id,
  session.starts_at,
  session.started_at,
  session.status,
  session.attendance_saved_at,
  session.finished_at,
  session.finished_by,
  session.playlist_url,
  session.notes,
  count(*) filter (where attendance.status = 'presente'::public.attendance_status) as present_count,
  count(*) filter (where attendance.status = 'ausente'::public.attendance_status) as absent_count
from public.class_sessions session
join public.classes class on class.id = session.class_id
left join public.attendance attendance on attendance.session_id = session.id
group by session.id, class.id;

create or replace function public.save_attendance(
  p_session_id uuid,
  p_present uuid[],
  p_absent uuid[]
)
returns void
language plpgsql
set search_path = ''
as $function$
declare
  v_session public.class_sessions;
  v_present uuid[] := coalesce(p_present, '{}'::uuid[]);
  v_absent uuid[] := coalesce(p_absent, '{}'::uuid[]);
  v_duration integer;
  v_today date;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if cardinality(v_present) = 0 then
    raise exception 'select at least one present student';
  end if;

  if cardinality(v_absent) > 0 then
    raise exception 'absent selections are not supported';
  end if;

  if cardinality(v_present) <> (
    select count(distinct id) from unnest(v_present) as selected(id)
  ) then
    raise exception 'duplicate student selection';
  end if;

  select * into v_session
  from public.class_sessions
  where id = p_session_id
  for update;

  if v_session.id is null then
    raise exception 'class session not found';
  end if;

  if v_session.status in ('completada', 'cancelada') then
    raise exception 'class session is closed';
  end if;

  select duration_minutes into v_duration
  from public.classes
  where id = v_session.class_id;

  if v_duration is null then
    raise exception 'class duration not found';
  end if;

  if now() < v_session.starts_at - interval '15 minutes' then
    raise exception 'attendance not open yet';
  end if;

  if now() > v_session.starts_at + make_interval(mins => v_duration) then
    raise exception 'attendance window closed';
  end if;

  if (
    select count(*)
    from public.students
    where active and id = any(v_present)
  ) <> cardinality(v_present) then
    raise exception 'invalid active student selection';
  end if;

  if v_session.attendance_saved_at is not null then
    if (
      select count(*)
      from public.attendance
      where session_id = p_session_id
        and status = 'presente'
        and student_id = any(v_present)
    ) = cardinality(v_present)
    and (
      select count(*)
      from public.attendance
      where session_id = p_session_id
    ) = cardinality(v_present) then
      return;
    end if;

    raise exception 'attendance already saved';
  end if;

  select (now() at time zone timezone)::date into v_today
  from public.academy_settings
  where id;

  perform id
  from public.students
  where id = any(v_present)
  order by id
  for update;

  insert into public.attendance (session_id, student_id, status, marked_by)
  select
    p_session_id,
    id,
    'presente'::public.attendance_status,
    (select auth.uid())
  from unnest(v_present) as selected(id);

  update public.students
  set
    current_streak = current_streak + 1,
    highest_streak = greatest(highest_streak, current_streak + 1)
  where id = any(v_present);

  with pass_to_consume as (
    select (
      select membership.id
      from public.memberships membership
      join public.membership_plans plan on plan.id = membership.plan_id
      where membership.student_id = present.student_id
        and plan.kind = 'clase_suelta'
        and membership.cancelled_at is null
        and membership.consumed_at is null
        and membership.fecha_inicio <= v_today
        and membership.fecha_vencimiento >= v_today
      order by membership.created_at, membership.id
      limit 1
    ) as membership_id
    from unnest(v_present) as present(student_id)
  )
  update public.memberships membership
  set consumed_at = now()
  from pass_to_consume selected
  where membership.id = selected.membership_id;

  update public.class_sessions
  set
    attendance_saved_at = now(),
    started_at = coalesce(
      started_at,
      case when now() >= starts_at then now() else starts_at end
    ),
    status = 'en_curso'
  where id = p_session_id;
end;
$function$;

drop function if exists public.finish_class_session(uuid, text);

create function public.finish_class_session(
  p_session_id uuid,
  p_playlist_url text default null,
  p_notes text default null
)
returns void
language plpgsql
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
    notes = v_notes
  where id = p_session_id;

  update public.profiles
  set
    current_class_streak = current_class_streak + 1,
    highest_class_streak = greatest(highest_class_streak, current_class_streak + 1),
    updated_at = now()
  where id = v_session.instructor_id;
end;
$function$;

grant execute on function public.finish_class_session(uuid, text, text) to authenticated;
