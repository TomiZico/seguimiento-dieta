-- Multiusuario: cada persona tiene su propia cuenta (Supabase Auth) y sus
-- propios datos. Reemplaza las policies permisivas de "anon" por policies
-- scoped a auth.uid().

alter table meals add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table notification_settings
add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table push_subscriptions
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table meals alter column user_id set default auth.uid ();
alter table notification_settings alter column user_id set default auth.uid ();
alter table push_subscriptions alter column user_id set default auth.uid ();

-- Filas viejas de la etapa de un solo usuario, sin user_id: los datos de
-- notification_settings no tienen sentido sin dueño (el cliente ya sabe
-- generar sus valores por defecto), así que se descartan. Los "meals"
-- existentes se migran a mano al dueño original después de que cree su
-- cuenta (ver instrucciones en el chat / README).
delete from notification_settings where user_id is null;
delete from push_subscriptions where user_id is null;

drop policy if exists "meals: allow all (anon)" on meals;
drop policy if exists "notification_settings: allow all (anon)" on notification_settings;
drop policy if exists "push_subscriptions: allow all (anon)" on push_subscriptions;

create policy "meals: own rows" on meals for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

create policy "notification_settings: own rows" on notification_settings for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

create policy "push_subscriptions: own rows" on push_subscriptions for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

-- notification_settings: la primary key pasa de (meal_type) a (user_id, meal_type).
alter table notification_settings drop constraint if exists notification_settings_pkey;
alter table notification_settings
add primary key (user_id, meal_type);

-- push_subscriptions: antes el endpoint era único global; ahora único por usuario
-- (dos personas usando el mismo navegador/dispositivo en momentos distintos
-- pueden terminar con el mismo endpoint, cada una con su propia fila).
alter table push_subscriptions drop constraint if exists push_subscriptions_endpoint_key;
alter table push_subscriptions
add constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint);

create index if not exists meals_user_date_idx on meals (user_id, date);
