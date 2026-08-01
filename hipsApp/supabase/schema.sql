-- HipsApp: esquema integral para instructores.
-- Este archivo reinicia las tablas de la aplicación; Supabase Auth se conserva.

drop view if exists public.session_overview;
drop view if exists public.student_overview;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_staff_user();
drop function if exists public.save_attendance;
drop function if exists public.register_membership_payment;
drop function if exists public.mark_attendance(uuid);

drop table if exists public.message_recipients cascade;
drop table if exists public.message_batches cascade;
drop table if exists public.message_templates cascade;
drop table if exists public.attendance cascade;
drop table if exists public.class_sessions cascade;
drop table if exists public.classes cascade;
drop table if exists public.playlist_tracks cascade;
drop table if exists public.playlists cascade;
drop table if exists public.payments cascade;
drop table if exists public.memberships cascade;
drop table if exists public.membership_plans cascade;
drop table if exists public.rewards cascade;
drop table if exists public.students cascade;
drop table if exists public.profiles cascade;
drop table if exists public.academy_settings cascade;

drop type if exists public.message_status;
drop type if exists public.message_batch_status;
drop type if exists public.payment_method;
drop type if exists public.attendance_status;
drop type if exists public.class_session_status;
drop type if exists public.membership_plan_kind;
drop type if exists public.staff_role;
drop type if exists public.reward_status;
drop type if exists public.membership_status;

create type public.staff_role as enum ('instructor', 'admin');
create type public.membership_plan_kind as enum ('mensual', 'clase_suelta');
create type public.class_session_status as enum (
  'programada',
  'en_curso',
  'completada',
  'cancelada'
);
create type public.attendance_status as enum ('presente', 'ausente');
create type public.payment_method as enum ('efectivo', 'transferencia', 'tarjeta');
create type public.message_batch_status as enum (
  'pendiente',
  'procesando',
  'pausado',
  'completado',
  'fallido'
);
create type public.message_status as enum (
  'pendiente',
  'enviado',
  'fallido',
  'cancelado'
);

create table public.academy_settings (
  id boolean primary key default true check (id),
  academy_name text not null default 'Hipsdance',
  timezone text not null default 'America/Mexico_City',
  whatsapp_min_delay_seconds integer not null default 3
    check (whatsapp_min_delay_seconds between 3 and 8),
  whatsapp_max_delay_seconds integer not null default 8
    check (
      whatsapp_max_delay_seconds between 3 and 8
      and whatsapp_max_delay_seconds >= whatsapp_min_delay_seconds
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  role public.staff_role not null default 'instructor',
  current_class_streak integer not null default 0 check (current_class_streak >= 0),
  highest_class_streak integer not null default 0
    check (highest_class_streak >= current_class_streak),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  telefono text not null unique
    check (telefono ~ '^\+[1-9][0-9]{7,14}$'),
  correo text,
  cumpleanos date,
  objetivo_peso_grasa numeric(5,2)
    check (objetivo_peso_grasa is null or objetivo_peso_grasa >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  highest_streak integer not null default 0 check (highest_streak >= current_streak),
  active boolean not null default true,
  fecha_registro timestamptz not null default now()
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind public.membership_plan_kind not null,
  price numeric(10,2) not null check (price >= 0),
  duration_days integer not null check (duration_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id),
  fecha_inicio date not null,
  fecha_vencimiento date not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (fecha_vencimiento >= fecha_inicio)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  membership_id uuid not null references public.memberships(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  method public.payment_method not null,
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null
);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  external_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  title text not null,
  artist text,
  bpm integer check (bpm is null or bpm > 0),
  genre text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  position integer not null check (position > 0),
  external_url text,
  unique (playlist_id, position)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  instructor_id uuid references public.profiles(id) on delete set null,
  playlist_id uuid references public.playlists(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, weekday, start_time)
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  instructor_id uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null,
  status public.class_session_status not null default 'programada',
  attendance_saved_at timestamptz,
  finished_at timestamptz,
  playlist_url text,
  notes text,
  created_at timestamptz not null default now(),
  unique (class_id, starts_at),
  check (finished_at is null or finished_at >= starts_at)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status not null,
  marked_at timestamptz not null default now(),
  marked_by uuid references public.profiles(id) on delete set null,
  unique (session_id, student_id)
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.message_batches (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.message_templates(id) on delete set null,
  session_id uuid references public.class_sessions(id) on delete set null,
  status public.message_batch_status not null default 'pendiente',
  min_delay_seconds integer not null default 3 check (min_delay_seconds between 3 and 8),
  max_delay_seconds integer not null default 8
    check (max_delay_seconds between 3 and 8 and max_delay_seconds >= min_delay_seconds),
  created_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.message_recipients (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.message_batches(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  status public.message_status not null default 'pendiente',
  scheduled_at timestamptz,
  sent_at timestamptz,
  error text,
  unique (batch_id, phone)
);

create index memberships_student_date_idx
  on public.memberships (student_id, fecha_vencimiento desc);
create index memberships_plan_idx on public.memberships (plan_id);
create index payments_student_paid_idx
  on public.payments (student_id, paid_at desc);
create index payments_membership_idx on public.payments (membership_id);
create index payments_recorded_by_idx on public.payments (recorded_by);
create index playlist_tracks_playlist_idx
  on public.playlist_tracks (playlist_id, position);
create index classes_instructor_idx on public.classes (instructor_id);
create index classes_playlist_idx on public.classes (playlist_id);
create index class_sessions_class_starts_idx
  on public.class_sessions (class_id, starts_at desc);
create index class_sessions_status_starts_idx
  on public.class_sessions (status, starts_at);
create index class_sessions_instructor_idx on public.class_sessions (instructor_id);
create index attendance_student_idx on public.attendance (student_id);
create index attendance_session_status_idx
  on public.attendance (session_id, status);
create index attendance_marked_by_idx on public.attendance (marked_by);
create index message_batches_template_idx on public.message_batches (template_id);
create index message_batches_session_idx on public.message_batches (session_id);
create index message_batches_created_by_idx on public.message_batches (created_by);
create index message_recipients_batch_status_idx
  on public.message_recipients (batch_id, status);
create index message_recipients_student_idx on public.message_recipients (student_id);

create view public.student_overview
with (security_invoker = true)
as
select
  s.id,
  s.nombre,
  s.telefono,
  s.objetivo_peso_grasa,
  s.current_streak,
  s.highest_streak,
  s.active,
  s.fecha_registro,
  membership.id as membership_id,
  membership.plan_name,
  membership.fecha_vencimiento,
  case
    when membership.id is null then 'sin_registro'
    when membership.cancelled_at is not null then 'vencida'
    when membership.fecha_vencimiento < local.today then 'vencida'
    when membership.fecha_vencimiento <= local.today + 3 then 'por_vencer'
    else 'activa'
  end as membership_status,
  coalesce(stats.attendance_count, 0)::bigint as attendance_count,
  s.cumpleanos,
  s.correo
from public.students s
cross join lateral (
  select (now() at time zone settings.timezone)::date as today
  from public.academy_settings settings
  where settings.id
) local
left join lateral (
  select
    m.id,
    p.name as plan_name,
    m.fecha_vencimiento,
    m.cancelled_at
  from public.memberships m
  join public.membership_plans p on p.id = m.plan_id
  where m.student_id = s.id
  order by m.fecha_vencimiento desc, m.created_at desc
  limit 1
) membership on true
left join lateral (
  select count(*) as attendance_count
  from public.attendance a
  where a.student_id = s.id and a.status = 'presente'
) stats on true;

create view public.session_overview
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
  count(*) filter (where attendance.status = 'presente')::bigint as present_count,
  count(*) filter (where attendance.status = 'ausente')::bigint as absent_count
from public.class_sessions session
join public.classes class on class.id = session.class_id
left join public.attendance attendance on attendance.session_id = session.id
group by session.id, class.id;

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
    v_today + (v_plan.duration_days - 1)
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

  update public.class_sessions
  set
    attendance_saved_at = now(),
    status = 'en_curso'
  where id = p_session_id;
end;
$$;

create or replace function public.finish_class_session(
  p_session_id uuid,
  p_playlist_url text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
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

  update public.class_sessions
  set
    status = 'completada',
    finished_at = now(),
    playlist_url = coalesce(p_playlist_url, playlist_url)
  where id = p_session_id;

  update public.profiles
  set
    current_class_streak = current_class_streak + 1,
    highest_class_streak = greatest(
      highest_class_streak,
      current_class_streak + 1
    ),
    updated_at = now()
  where id = v_session.instructor_id;
end;
$$;

revoke all on function public.register_membership_payment(
  uuid,
  uuid,
  public.payment_method
) from public, anon;
revoke all on function public.save_attendance(uuid, uuid[], uuid[])
  from public, anon;
revoke all on function public.finish_class_session(uuid, text)
  from public, anon;
grant execute on function public.register_membership_payment(
  uuid,
  uuid,
  public.payment_method
) to authenticated;
grant execute on function public.save_attendance(uuid, uuid[], uuid[])
  to authenticated;
grant execute on function public.finish_class_session(uuid, text)
  to authenticated;

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
      split_part(coalesce(new.email, 'Instructor'), '@', 1)
    ),
    coalesce(new.email, new.id::text || '@hipsapp.local'),
    case
      when new.raw_app_meta_data ->> 'role' = 'admin'
        then 'admin'::public.staff_role
      else 'instructor'::public.staff_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_staff_user()
  from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_staff_user();

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"instructor"}'::jsonb;

insert into public.profiles (id, full_name, email)
select
  id,
  coalesce(
    nullif(raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(email, 'Instructor'), '@', 1)
  ),
  coalesce(email, id::text || '@hipsapp.local')
from auth.users;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'academy_settings',
    'students',
    'membership_plans',
    'memberships',
    'payments',
    'playlists',
    'playlist_tracks',
    'classes',
    'class_sessions',
    'attendance',
    'message_templates',
    'message_batches',
    'message_recipients'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy staff_access on public.%I for all to authenticated
       using (((select auth.jwt()) -> ''app_metadata'' ->> ''role'') in (''instructor'', ''admin''))
       with check (((select auth.jwt()) -> ''app_metadata'' ->> ''role'') in (''instructor'', ''admin''))',
      table_name
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
create policy staff_read_profiles
  on public.profiles
  for select
  to authenticated
  using (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('instructor', 'admin')
  );
create policy staff_update_own_profile
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on table
  public.academy_settings,
  public.profiles,
  public.students,
  public.membership_plans,
  public.memberships,
  public.payments,
  public.playlists,
  public.playlist_tracks,
  public.classes,
  public.class_sessions,
  public.attendance,
  public.message_templates,
  public.message_batches,
  public.message_recipients
from anon;
revoke all on table public.student_overview, public.session_overview
  from public, anon;

grant select, update on public.academy_settings to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select on public.membership_plans to authenticated;
grant select, insert, update on public.memberships to authenticated;
grant select, insert on public.payments to authenticated;
grant select, insert, update, delete on public.playlists to authenticated;
grant select, insert, update, delete on public.playlist_tracks to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update on public.class_sessions to authenticated;
grant select, insert, update on public.attendance to authenticated;
grant select, insert, update, delete on public.message_templates to authenticated;
grant select, insert, update on public.message_batches to authenticated;
grant select, insert, update on public.message_recipients to authenticated;
grant select on public.student_overview, public.session_overview to authenticated;

insert into public.academy_settings (id) values (true);

insert into public.membership_plans (name, kind, price, duration_days)
values
  ('Mensual', 'mensual', 650, 30),
  ('Clase suelta', 'clase_suelta', 150, 1);

with playlist as (
  insert into public.playlists (name)
  values ('Zumba de hoy')
  returning id
)
insert into public.playlist_tracks (
  playlist_id,
  title,
  artist,
  bpm,
  genre,
  duration_seconds,
  position
)
select id, 'Caliente', null, 130, 'Latin Pop', 208, 1 from playlist
union all
select id, 'Baila Conmigo', null, 128, 'Reggaetón', 195, 2 from playlist;

with class as (
  insert into public.classes (
    name,
    weekday,
    start_time,
    instructor_id,
    playlist_id
  )
  select
    'Zumba',
    extract(dow from now() at time zone 'America/Mexico_City')::smallint,
    time '19:00',
    (select id from public.profiles order by created_at limit 1),
    (select id from public.playlists where name = 'Zumba de hoy')
  returning id, instructor_id
)
insert into public.class_sessions (class_id, instructor_id, starts_at)
select
  id,
  instructor_id,
  (
    (now() at time zone 'America/Mexico_City')::date + time '19:00'
  ) at time zone 'America/Mexico_City'
from class;

insert into public.message_templates (name, body)
values
  ('Recordatorio de clase', 'Hola {{nombre}}, te esperamos hoy en {{clase}}.'),
  ('Aviso de pago', 'Hola {{nombre}}, tu membresía vence el {{fecha}}.'),
  ('Confirmación de pago', 'Recibimos tu pago. Tu membresía está activa hasta el {{fecha}}.');
