create table if not exists public.transfer_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Cuenta bancaria',
  bank text not null,
  holder text not null,
  card text,
  clabe text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint transfer_accounts_label_check check (char_length(trim(label)) between 1 and 80),
  constraint transfer_accounts_bank_check check (char_length(trim(bank)) between 1 and 100),
  constraint transfer_accounts_holder_check check (char_length(trim(holder)) between 1 and 150),
  constraint transfer_accounts_card_check check (card is null or card = '' or card ~ '^[0-9]{16,19}$'),
  constraint transfer_accounts_clabe_check check (clabe is null or clabe = '' or clabe ~ '^[0-9]{18}$'),
  constraint transfer_accounts_destination_check check (
    coalesce(nullif(card, ''), nullif(clabe, '')) is not null
  )
);

create index if not exists transfer_accounts_active_order_idx
  on public.transfer_accounts(active, sort_order, created_at);

insert into public.transfer_accounts (
  label,
  bank,
  holder,
  card,
  clabe,
  sort_order
)
select
  'Cuenta principal',
  trim(transfer_bank),
  trim(transfer_holder),
  nullif(regexp_replace(transfer_card, '\D', '', 'g'), ''),
  nullif(regexp_replace(transfer_clabe, '\D', '', 'g'), ''),
  0
from public.academy_settings
where id = true
  and trim(transfer_bank) <> ''
  and trim(transfer_holder) <> ''
  and coalesce(
    nullif(regexp_replace(transfer_card, '\D', '', 'g'), ''),
    nullif(regexp_replace(transfer_clabe, '\D', '', 'g'), '')
  ) is not null
  and not exists (select 1 from public.transfer_accounts);

alter table public.transfer_accounts enable row level security;

create or replace function public.list_transfer_accounts()
returns table (
  id uuid,
  label text,
  bank text,
  holder text,
  card text,
  clabe text,
  sort_order integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in (
        'superadmin'::public.staff_role,
        'admin'::public.staff_role,
        'instructor'::public.staff_role
      )
  ) then
    raise exception 'manager required';
  end if;

  return query
  select
    account.id,
    account.label,
    account.bank,
    account.holder,
    account.card,
    account.clabe,
    account.sort_order
  from public.transfer_accounts account
  where account.active
  order by account.sort_order, account.created_at, account.id;
end;
$$;

create or replace function public.upsert_transfer_account(
  p_id uuid,
  p_label text,
  p_bank text,
  p_holder text,
  p_card text default null,
  p_clabe text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid := p_id;
  v_label text := trim(coalesce(p_label, ''));
  v_bank text := trim(coalesce(p_bank, ''));
  v_holder text := trim(coalesce(p_holder, ''));
  v_card text := nullif(regexp_replace(coalesce(p_card, ''), '\D', '', 'g'), '');
  v_clabe text := nullif(regexp_replace(coalesce(p_clabe, ''), '\D', '', 'g'), '');
begin
  if v_actor is null or not exists (
    select 1 from public.profiles
    where id = v_actor and role = 'superadmin'::public.staff_role
  ) then
    raise exception 'superadmin required';
  end if;

  if char_length(v_label) < 1 or char_length(v_label) > 80 then
    raise exception 'invalid account label';
  end if;
  if char_length(v_bank) < 1 or char_length(v_bank) > 100 then
    raise exception 'invalid bank';
  end if;
  if char_length(v_holder) < 1 or char_length(v_holder) > 150 then
    raise exception 'invalid holder';
  end if;
  if v_card is not null and v_card !~ '^[0-9]{16,19}$' then
    raise exception 'invalid card';
  end if;
  if v_clabe is not null and v_clabe !~ '^[0-9]{18}$' then
    raise exception 'invalid clabe';
  end if;
  if v_card is null and v_clabe is null then
    raise exception 'transfer destination required';
  end if;

  if v_id is null then
    insert into public.transfer_accounts (
      label, bank, holder, card, clabe, sort_order, created_by
    )
    values (
      v_label,
      v_bank,
      v_holder,
      v_card,
      v_clabe,
      coalesce((select max(sort_order) + 1 from public.transfer_accounts), 0),
      v_actor
    )
    returning id into v_id;
  else
    update public.transfer_accounts
    set
      label = v_label,
      bank = v_bank,
      holder = v_holder,
      card = v_card,
      clabe = v_clabe,
      active = true,
      updated_at = now()
    where id = v_id;

    if not found then
      raise exception 'transfer account not found';
    end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.delete_transfer_account(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not exists (
    select 1 from public.profiles
    where id = v_actor and role = 'superadmin'::public.staff_role
  ) then
    raise exception 'superadmin required';
  end if;

  delete from public.transfer_accounts where id = p_id;
  if not found then
    raise exception 'transfer account not found';
  end if;
end;
$$;

create or replace function public.save_payment_settings(
  p_monthly_price numeric,
  p_single_class_price numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not exists (
    select 1 from public.profiles
    where id = v_actor and role = 'superadmin'::public.staff_role
  ) then
    raise exception 'superadmin required';
  end if;

  if p_monthly_price is null or p_monthly_price < 0 or p_monthly_price > 99999999.99 then
    raise exception 'invalid monthly price';
  end if;
  if p_single_class_price is null or p_single_class_price < 0 or p_single_class_price > 99999999.99 then
    raise exception 'invalid single class price';
  end if;

  update public.academy_settings
  set
    monthly_plan_price = round(p_monthly_price, 2),
    single_class_price = round(p_single_class_price, 2),
    payment_settings_updated_at = now(),
    payment_settings_updated_by = v_actor,
    updated_at = now()
  where id = true;

  update public.membership_plans
  set price = round(p_monthly_price, 2)
  where kind = 'mensual';

  update public.membership_plans
  set price = round(p_single_class_price, 2)
  where kind = 'clase_suelta';
end;
$$;

drop function if exists public.confirm_membership_payment(
  uuid,
  uuid,
  public.payment_method,
  numeric,
  text
);

create function public.confirm_membership_payment(
  p_student_id uuid,
  p_plan_id uuid,
  p_method public.payment_method,
  p_amount_received numeric,
  p_reference text default null,
  p_start_date date default null
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
  v_start date;
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

  v_start := coalesce(p_start_date, v_today);
  if v_start > v_today then
    raise exception 'start date cannot be in the future';
  end if;

  v_expiration := case v_plan.kind
    when 'mensual' then (v_start + interval '1 month')::date
    when 'clase_suelta' then v_start
    else v_start + (v_plan.duration_days - 1)
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
    v_start,
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

  return query select v_payment_id, v_membership.id;
end;
$$;

create or replace function public.delete_app_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_role public.staff_role;
  v_has_profile boolean;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles
    where id = v_actor and role = 'superadmin'::public.staff_role
  ) then
    raise exception 'superadmin required';
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  v_has_profile := found;

  if v_has_profile and (v_role = 'superadmin'::public.staff_role or p_user_id = v_actor) then
    raise exception 'protected superadmin';
  end if;

  if not v_has_profile and not exists (
    select 1 from public.students where id = p_user_id
  ) then
    raise exception 'managed user not found';
  end if;

  if exists (select 1 from public.payments where student_id = p_user_id) then
    raise exception 'user has payments';
  end if;

  delete from public.students where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.list_transfer_accounts() from public, anon;
revoke all on function public.upsert_transfer_account(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.delete_transfer_account(uuid) from public, anon;
revoke all on function public.save_payment_settings(numeric, numeric) from public, anon;
revoke all on function public.confirm_membership_payment(uuid, uuid, public.payment_method, numeric, text, date) from public, anon;
revoke all on function public.delete_app_user(uuid) from public, anon;

grant execute on function public.list_transfer_accounts() to authenticated;
grant execute on function public.upsert_transfer_account(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.delete_transfer_account(uuid) to authenticated;
grant execute on function public.save_payment_settings(numeric, numeric) to authenticated;
grant execute on function public.confirm_membership_payment(uuid, uuid, public.payment_method, numeric, text, date) to authenticated;
grant execute on function public.delete_app_user(uuid) to authenticated;
