-- Seguimiento de Dieta: esquema inicial
-- Pensado para un único usuario (sin autenticación): las policies son
-- permisivas para la clave "anon". Si en el futuro se agrega
-- autenticación, hay que reemplazarlas por policies scoped a auth.uid().

create extension if not exists "pgcrypto";

create type meal_type as enum (
  'desayuno',
  'media_manana',
  'almuerzo',
  'media_tarde',
  'merienda',
  'cena'
);

create type meal_status as enum ('pendiente', 'comido', 'salteado');

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  meal_type meal_type not null,
  food text not null default '',
  time time not null,
  status meal_status not null default 'pendiente',
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists meals_date_idx on meals (date);
create index if not exists meals_pending_notify_idx on meals (date, time) where notified_at is null;

create table if not exists notification_settings (
  meal_type meal_type primary key,
  lead_minutes integer not null default 60,
  enabled boolean not null default true
);

insert into notification_settings (meal_type, lead_minutes, enabled)
values
  ('desayuno', 60, true),
  ('media_manana', 60, true),
  ('almuerzo', 60, true),
  ('media_tarde', 60, true),
  ('merienda', 60, true),
  ('cena', 60, true)
on conflict (meal_type) do nothing;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table meals enable row level security;
alter table notification_settings enable row level security;
alter table push_subscriptions enable row level security;

-- App de un solo usuario: acceso total con la clave anon.
-- (Ver README para el trade-off de seguridad de este enfoque.)
create policy "meals: allow all (anon)" on meals for all using (true) with check (true);
create policy "notification_settings: allow all (anon)" on notification_settings for all using (true) with check (true);
create policy "push_subscriptions: allow all (anon)" on push_subscriptions for all using (true) with check (true);
