alter table public.memberships
  add column if not exists consumed_at timestamptz;

with consumed as (
  select membership.id, min(attendance.marked_at) as consumed_at
  from public.memberships membership
  join public.membership_plans plan on plan.id = membership.plan_id
  join public.attendance attendance
    on attendance.student_id = membership.student_id
  cross join public.academy_settings settings
  where settings.id
    and plan.kind = 'clase_suelta'
    and attendance.status = 'presente'
    and attendance.marked_at >= membership.created_at
    and (attendance.marked_at at time zone settings.timezone)::date =
      membership.fecha_inicio
  group by membership.id
)
update public.memberships membership
set consumed_at = consumed.consumed_at
from consumed
where membership.id = consumed.id;

create or replace view public.student_overview
with (security_invoker = true)
as
select
  student.id,
  student.nombre,
  student.telefono,
  student.objetivo_peso_grasa,
  student.current_streak,
  student.highest_streak,
  student.active,
  student.fecha_registro,
  membership.id as membership_id,
  membership.plan_name,
  membership.fecha_vencimiento,
  case
    when membership.id is null then 'sin_registro'
    when membership.cancelled_at is not null then 'vencida'
    when membership.plan_kind = 'clase_suelta'
      and (
        membership.consumed_at is not null
        or membership.fecha_vencimiento < local.today
      ) then 'vencida'
    when membership.plan_kind = 'clase_suelta' then 'activa'
    when membership.fecha_vencimiento < local.today then 'vencida'
    when membership.fecha_vencimiento <= local.today + 3 then 'por_vencer'
    else 'activa'
  end as membership_status,
  coalesce(stats.attendance_count, 0)::bigint as attendance_count,
  student.cumpleanos,
  student.correo
from public.students student
cross join lateral (
  select (now() at time zone settings.timezone)::date as today
  from public.academy_settings settings
  where settings.id
) local
left join lateral (
  select
    membership.id,
    plan.name as plan_name,
    plan.kind as plan_kind,
    membership.fecha_vencimiento,
    membership.cancelled_at,
    membership.consumed_at
  from public.memberships membership
  join public.membership_plans plan on plan.id = membership.plan_id
  where membership.student_id = student.id
  order by membership.fecha_vencimiento desc, membership.created_at desc
  limit 1
) membership on true
left join lateral (
  select count(*) as attendance_count
  from public.attendance attendance
  where attendance.student_id = student.id
    and attendance.status = 'presente'
) stats on true;

create or replace function public.register_membership_payment(
  p_student_id uuid,
  p_plan_id uuid,
  p_method public.payment_method
)
returns public.memberships
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan public.membership_plans;
  v_membership public.memberships;
  v_today date;
  v_expiration date;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  select * into v_plan
  from public.membership_plans
  where id = p_plan_id and active
  for share;

  if v_plan.id is null then
    raise exception 'membership plan not found';
  end if;

  select (now() at time zone timezone)::date into v_today
  from public.academy_settings
  where id;

  v_expiration := case v_plan.kind
    when 'mensual' then (v_today + interval '1 month')::date
    when 'clase_suelta' then v_today
    else v_today + (v_plan.duration_days - 1)
  end;

  insert into public.memberships (
    student_id,
    plan_id,
    fecha_inicio,
    fecha_vencimiento
  )
  values (
    p_student_id,
    p_plan_id,
    v_today,
    v_expiration
  )
  returning * into v_membership;

  insert into public.payments (
    student_id,
    membership_id,
    amount,
    method,
    recorded_by
  )
  values (
    p_student_id,
    v_membership.id,
    v_plan.price,
    p_method,
    (select auth.uid())
  );

  return v_membership;
end;
$$;

create or replace function public.save_attendance(
  p_session_id uuid,
  p_present uuid[],
  p_absent uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.class_sessions;
  v_present uuid[] := coalesce(p_present, '{}'::uuid[]);
  v_absent uuid[] := coalesce(p_absent, '{}'::uuid[]);
  v_total integer;
  v_today date;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if v_present && v_absent then
    raise exception 'a student cannot be present and absent';
  end if;

  if cardinality(v_present) <> (
    select count(distinct id) from unnest(v_present) as selected(id)
  ) or cardinality(v_absent) <> (
    select count(distinct id) from unnest(v_absent) as selected(id)
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

  select (now() at time zone timezone)::date into v_today
  from public.academy_settings
  where id;

  select count(*) into v_total
  from public.students
  where active;

  if cardinality(v_present) + cardinality(v_absent) <> v_total
    or (
      select count(*)
      from public.students
      where active and id = any(v_present || v_absent)
    ) <> v_total then
    raise exception 'attendance must include every active student';
  end if;

  if v_session.attendance_saved_at is not null then
    if (
      select count(*)
      from public.attendance
      where session_id = p_session_id
        and (
          (status = 'presente' and student_id = any(v_present))
          or (status = 'ausente' and student_id = any(v_absent))
        )
    ) = v_total then
      return;
    end if;
    raise exception 'attendance was already saved with different values';
  end if;

  perform id
  from public.students
  where id = any(v_present || v_absent)
  order by id
  for update;

  insert into public.attendance (session_id, student_id, status, marked_by)
  select p_session_id, id, 'presente'::public.attendance_status, (select auth.uid())
  from unnest(v_present) as selected(id)
  union all
  select p_session_id, id, 'ausente'::public.attendance_status, (select auth.uid())
  from unnest(v_absent) as selected(id);

  update public.students
  set
    current_streak = current_streak + 1,
    highest_streak = greatest(highest_streak, current_streak + 1)
  where id = any(v_present);

  update public.students
  set current_streak = 0
  where id = any(v_absent);

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
$$;

revoke all on function public.register_membership_payment(
  uuid,
  uuid,
  public.payment_method
) from public, anon;
revoke all on function public.save_attendance(uuid, uuid[], uuid[])
  from public, anon;
grant execute on function public.register_membership_payment(
  uuid,
  uuid,
  public.payment_method
) to authenticated;
grant execute on function public.save_attendance(uuid, uuid[], uuid[])
  to authenticated;
