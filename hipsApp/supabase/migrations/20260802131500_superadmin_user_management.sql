create or replace function public.create_app_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role public.staff_role,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_user_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_name text := trim(p_full_name);
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if v_actor is null or not exists (
    select 1
    from public.profiles
    where id = v_actor and role = 'superadmin'::public.staff_role
  ) then
    raise exception 'superadmin required';
  end if;

  if p_role not in ('admin'::public.staff_role, 'alumno'::public.staff_role) then
    raise exception 'invalid managed role';
  end if;

  if v_name = '' or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid user data';
  end if;

  if length(p_password) < 8 then
    raise exception 'password too short';
  end if;

  if p_role = 'alumno'::public.staff_role and v_phone is null then
    raise exception 'student phone required';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'email already registered';
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email'),
      'role', p_role::text
    ),
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'full_name', v_name,
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now(),
    false,
    false
  );

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at,
    last_sign_in_at
  ) values (
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  update public.profiles
  set
    full_name = v_name,
    email = v_email,
    role = p_role,
    whatsapp = case when p_role = 'alumno'::public.staff_role then v_phone else null end,
    updated_at = now()
  where id = v_user_id;

  if p_role = 'alumno'::public.staff_role then
    insert into public.students (id, nombre, telefono, correo)
    values (v_user_id, v_name, v_phone, v_email);
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.create_app_user(text, text, text, public.staff_role, text) from public;
grant execute on function public.create_app_user(text, text, text, public.staff_role, text) to authenticated;
