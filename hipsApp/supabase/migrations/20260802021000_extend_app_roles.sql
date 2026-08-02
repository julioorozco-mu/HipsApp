alter type public.staff_role add value if not exists 'superadmin';
alter type public.staff_role add value if not exists 'alumno';

alter table public.profiles
  alter column role set default 'admin';

alter table public.academy_settings
  add column if not exists address text;
