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
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not exists (
    select 1
    from public.profiles as profile
    where profile.id = v_actor
      and profile.role in (
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
  from public.transfer_accounts as account
  where account.active
  order by account.sort_order, account.created_at, account.id;
end;
$$;

revoke all on function public.list_transfer_accounts() from public, anon;
grant execute on function public.list_transfer_accounts() to authenticated;
