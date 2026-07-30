-- ============================================================
-- Fase 1: Esquema base academia de baile
-- ============================================================

-- Enums para estados controlados
create type membership_status as enum ('activa', 'por_vencer', 'vencida');
create type reward_status as enum ('disponible', 'canjeado');

-- ------------------------------------------------------------
-- students
-- ------------------------------------------------------------
create table students (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  objetivo_peso_grasa numeric(5,2),
  current_streak integer not null default 0,
  highest_streak integer not null default 0,
  fecha_registro timestamptz not null default now()
);

comment on column students.telefono is 'Formato E.164 para integracion con WhatsApp';

-- ------------------------------------------------------------
-- memberships
-- ------------------------------------------------------------
create table memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  fecha_inicio date not null,
  fecha_vencimiento date not null,
  estado membership_status not null default 'activa',
  created_at timestamptz not null default now(),
  constraint memberships_fechas_check check (fecha_vencimiento >= fecha_inicio)
);

create index idx_memberships_student_id on memberships(student_id);
-- consulta frecuente: membresias activas/por vencer de un alumno
create index idx_memberships_estado on memberships(estado);

-- ------------------------------------------------------------
-- attendance
-- ------------------------------------------------------------
create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  fecha_hora timestamptz not null default now()
);

create index idx_attendance_student_id on attendance(student_id);
-- consulta frecuente: asistencias de un alumno ordenadas por fecha
create index idx_attendance_student_fecha on attendance(student_id, fecha_hora desc);

-- ------------------------------------------------------------
-- rewards
-- ------------------------------------------------------------
create table rewards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  tipo_premio text not null,
  estado reward_status not null default 'disponible',
  created_at timestamptz not null default now(),
  canjeado_at timestamptz
);

create index idx_rewards_student_id on rewards(student_id);
create index idx_rewards_estado on rewards(estado);

-- ============================================================
-- Row Level Security
-- Sistema interno: solo usuarios autenticados (maestros) acceden.
-- Ajustar policies cuando exista tabla de roles/staff.
-- ============================================================

alter table students enable row level security;
alter table memberships enable row level security;
alter table attendance enable row level security;
alter table rewards enable row level security;

create policy "authenticated_full_access_students" on students
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_memberships" on memberships
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_attendance" on attendance
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_rewards" on rewards
  for all to authenticated using (true) with check (true);

-- ============================================================
-- mark_attendance: inserta asistencia y actualiza streak de forma
-- atomica (evita condicion de carrera por doble tap / doble submit).
-- ============================================================
create or replace function mark_attendance(p_student_id uuid)
returns students
language plpgsql
security invoker
as $$
declare
  v_student students;
begin
  insert into attendance (student_id) values (p_student_id);

  update students
  set
    current_streak = current_streak + 1,
    highest_streak = greatest(highest_streak, current_streak + 1)
  where id = p_student_id
  returning * into v_student;

  if v_student is null then
    raise exception 'student % not found', p_student_id;
  end if;

  return v_student;
end;
$$;
