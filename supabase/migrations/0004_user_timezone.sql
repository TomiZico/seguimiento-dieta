-- Zona horaria por usuario: antes la función de avisos asumía Argentina
-- (UTC-3) para todos. Con la app abierta a cualquiera, cada usuario puede
-- estar en un huso distinto, así que se guarda su zona (nombre IANA, ej.
-- "America/Argentina/Buenos_Aires") y la función de notificaciones la usa
-- para calcular "hoy" y "ahora" de cada uno por separado.

create table if not exists user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid (),
  timezone text not null default 'America/Argentina/Buenos_Aires',
  updated_at timestamptz not null default now ()
);

alter table user_profiles enable row level security;

create policy "user_profiles: own row" on user_profiles for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);
