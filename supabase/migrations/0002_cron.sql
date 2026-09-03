-- Programa la función "send-due-notifications" para que se ejecute cada minuto.
-- La función se despliega con verify_jwt=false (ver supabase/config.toml),
-- así que el cron no necesita llevar ninguna credencial: solo dispara la
-- URL y la función hace el resto usando su service role key interna.
-- Reemplazá PROJECT_REF por la referencia de tu proyecto (Project Settings →
-- General → Reference ID) si estás aplicando esto en un proyecto distinto.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-due-notifications-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/send-due-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
