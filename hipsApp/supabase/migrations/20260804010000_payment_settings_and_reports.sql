alter table public.academy_settings
  add column if not exists monthly_plan_price numeric(10,2),
  add column if not exists single_class_price numeric(10,2),
  add column if not exists transfer_bank text,
  add column if not exists transfer_holder text,
  add column if not exists transfer_card text,
  add column if not exists transfer_clabe text,
  add column if not exists payment_settings_updated_at timestamptz,
  add column if not exists payment_settings_updated_by uuid references public.profiles(id) on delete set null;

update public.academy_settings
set
  monthly_plan_price = coalesce(
    monthly_plan_price,
    (select price from public.membership_plans where kind = 'mensual' order by active desc, created_at limit 1),
    0
  ),
  single_class_price = coalesce(
    single_class_price,
    (select price from public.membership_plans where kind = 'clase_suelta' order by active desc, created_at limit 1),
    0
  ),
  transfer_bank = coalesce(nullif(trim(transfer_bank), ''), 'BBVA BANCOMER'),
  transfer_holder = coalesce(nullif(trim(transfer_holder), ''), 'Julio Cesar Orozco E.'),
  transfer_card = coalesce(nullif(regexp_replace(transfer_card, '\D', '', 'g'), ''), '4152314563108292'),
  transfer_clabe = coalesce(nullif(regexp_replace(transfer_clabe, '\D', '', 'g'), ''), '012180015133509782'),
  payment_settings_updated_at = coalesce(payment_settings_updated_at, now());

alter table public.academy_settings
  alter column monthly_plan_price set default 0,
  alter column monthly_plan_price set not null,
  alter column single_class_price set default 0,
  alter column single_class_price set not null,
  alter column transfer_bank set default '',
  alter column transfer_bank set not null,
  alter column transfer_holder set default '',
  alter column transfer_holder set not null,
  alter column transfer_card set default '',
  alter column transfer_card set not null,
  alter column transfer_clabe set default '',
  alter column transfer_clabe set not null,
  alter column payment_settings_updated_at set default now(),
  alter column payment_settings_updated_at set not null;

alter table public.academy_settings
  drop constraint if exists academy_settings_monthly_plan_price_check,
  add constraint academy_settings_monthly_plan_price_check
    check (monthly_plan_price >= 0 and monthly_plan_price <= 99999999.99),
  drop constraint if exists academy_settings_single_class_price_check,
  add constraint academy_settings_single_class_price_check
    check (single_class_price >= 0 and single_class_price <= 99999999.99),
  drop constraint if exists academy_settings_transfer_card_check,
  add constraint academy_settings_transfer_card_check
    check (transfer_card = '' or transfer_card ~ '^[0-9]{16,19}$'),
  drop constraint if exists academy_settings_transfer_clabe_check,
  add constraint academy_settings_transfer_clabe_check
    check (transfer_clabe = '' or transfer_clabe ~ '^[0-9]{18}$');

create or replace function public.save_payment_settings(
  p_monthly_price numeric,
  p_single_class_price numeric,
  p_bank text,
  p_holder text,
  p_card text,
  p_clabe text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_bank text := trim(coalesce(p_bank, ''));
  v_holder text := trim(coalesce(p_holder, ''));
  v_card text := regexp_replace(coalesce(p_card, ''), '\D', '', 'g');
  v_clabe text := regexp_replace(coalesce(p_clabe, ''), '\D', '', 'g');
begin
  if v_actor is null or not exists (
    select 1
    from public.profiles
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

  if v_bank = '' or length(v_bank) > 100 then
    raise exception 'invalid bank';
  end if;

  if v_holder = '' or length(v_holder) > 150 then
    raise exception 'invalid holder';
  end if;

  if v_card !~ '^[0-9]{16,19}$' then
    raise exception 'invalid card';
  end if;

  if v_clabe !~ '^[0-9]{18}$' then
    raise exception 'invalid clabe';
  end if;

  update public.academy_settings
  set
    monthly_plan_price = round(p_monthly_price, 2),
    single_class_price = round(p_single_class_price, 2),
    transfer_bank = v_bank,
    transfer_holder = v_holder,
    transfer_card = v_card,
    transfer_clabe = v_clabe,
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

revoke all on function public.save_payment_settings(numeric, numeric, text, text, text, text) from public;
grant execute on function public.save_payment_settings(numeric, numeric, text, text, text, text) to authenticated;
