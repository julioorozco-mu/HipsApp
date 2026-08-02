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
    status = 'en_curso'
  where id = p_session_id;
end;
$function$;

create or replace function public.finish_class_session(
  p_session_id uuid,
  p_playlist_url text default null
)
returns void
language plpgsql
set search_path = ''
as $function$
declare
  v_session public.class_sessions;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
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
    finished_at = now(),
    playlist_url = coalesce(p_playlist_url, playlist_url)
  where id = p_session_id;

  update public.profiles
  set
    current_class_streak = current_class_streak + 1,
    highest_class_streak = greatest(highest_class_streak, current_class_streak + 1),
    updated_at = now()
  where id = v_session.instructor_id;
end;
$function$;
