alter table public.profiles
  add column if not exists whatsapp text;

alter table public.classes
  add column if not exists capacity integer not null default 25
    check (capacity between 1 and 500);

alter table public.message_templates
  add column if not exists kind text not null default 'recordatorio'
    check (kind in ('recordatorio', 'pago', 'confirmacion', 'otro')),
  add column if not exists updated_at timestamptz not null default now();

alter table public.academy_settings
  add column if not exists currency text not null default 'MXN',
  add column if not exists business_hours text not null default 'Lun–Vie · 7:00–21:00',
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists appearance text not null default 'system'
    check (appearance in ('system', 'light', 'dark'));

insert into public.message_templates (name, body, kind, active)
values
  ('Recordatorio de clase', 'Hola {nombre}, te recordamos que tu clase de {clase} es hoy a las {hora}. ¡Te esperamos!', 'recordatorio', true),
  ('Aviso de pago', 'Hola {nombre}, tu pago de {clase} está pendiente. Cuando lo realices, envíanos tu comprobante.', 'pago', true),
  ('Confirmación de pago', '¡Gracias {nombre}! Hemos recibido tu pago y tu membresía está activa.', 'confirmacion', true)
on conflict (name) do nothing;
