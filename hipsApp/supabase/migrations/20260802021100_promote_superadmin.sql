update public.profiles
set role = 'superadmin'::public.staff_role,
    updated_at = now()
where id = (
  select id
  from public.profiles
  where role = 'admin'::public.staff_role
  order by created_at
  limit 1
);

create or replace function public.handle_new_staff_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, 'Usuario'), '@', 1)
    ),
    coalesce(new.email, new.id::text || '@hipsapp.local'),
    case new.raw_app_meta_data ->> 'role'
      when 'superadmin' then 'superadmin'::public.staff_role
      when 'alumno' then 'alumno'::public.staff_role
      else 'admin'::public.staff_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

do $$
declare
  target_table text;
  access_expression text :=
    '(((select auth.jwt()) -> ''app_metadata'' ->> ''role'') in (''superadmin'', ''admin'', ''instructor''))';
begin
  for target_table in
    select tablename
    from pg_policies
    where schemaname = 'public' and policyname = 'staff_access'
  loop
    execute format('drop policy staff_access on public.%I', target_table);
    execute format(
      'create policy staff_access on public.%I for all to authenticated using (%s) with check (%s)',
      target_table,
      access_expression,
      access_expression
    );
  end loop;
end;
$$;

drop policy if exists staff_read_profiles on public.profiles;
create policy staff_read_profiles
on public.profiles
for select
to authenticated
using (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role')
  in ('superadmin', 'admin', 'instructor')
  or id = (select auth.uid())
);
