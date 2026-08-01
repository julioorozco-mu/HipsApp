alter table public.payments
  add column if not exists amount_received numeric(10,2);

update public.payments
set amount_received = amount
where amount_received is null;

alter table public.payments
  alter column amount_received set not null;

alter table public.payments
  drop constraint if exists payments_amount_received_sufficient;

alter table public.payments
  add constraint payments_amount_received_sufficient
  check (amount_received >= amount);

alter table public.payments
  add column if not exists reference text;

alter table public.payments
  drop constraint if exists payments_reference_length;

alter table public.payments
  add constraint payments_reference_length
  check (reference is null or char_length(reference) <= 100);

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
    amount_received,
    method,
    recorded_by
  )
  values (
    p_student_id,
    v_membership.id,
    v_plan.price,
    v_plan.price,
    p_method,
    (select auth.uid())
  );

  return v_membership;
end;
$$;

create or replace function public.confirm_membership_payment(
  p_student_id uuid,
  p_plan_id uuid,
  p_method public.payment_method,
  p_amount_received numeric,
  p_reference text default null
)
returns table(payment_id uuid, membership_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan public.membership_plans;
  v_membership public.memberships;
  v_payment_id uuid;
  v_today date;
  v_expiration date;
  v_reference text;
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

  if p_amount_received is null or p_amount_received < v_plan.price then
    raise exception 'amount received is less than plan price';
  end if;

  v_reference := nullif(btrim(p_reference), '');

  if v_reference is not null and char_length(v_reference) > 100 then
    raise exception 'payment reference is too long';
  end if;

  if p_method <> 'transferencia'::public.payment_method then
    v_reference := null;
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
    amount_received,
    method,
    reference,
    recorded_by
  )
  values (
    p_student_id,
    v_membership.id,
    v_plan.price,
    p_amount_received,
    p_method,
    v_reference,
    (select auth.uid())
  )
  returning id into v_payment_id;

  return query
  select v_payment_id, v_membership.id;
end;
$$;

revoke all on function public.confirm_membership_payment(
  uuid,
  uuid,
  public.payment_method,
  numeric,
  text
) from public, anon;

grant execute on function public.confirm_membership_payment(
  uuid,
  uuid,
  public.payment_method,
  numeric,
  text
) to authenticated;
