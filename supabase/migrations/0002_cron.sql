-- Programa la función "send-due-notifications" para que se ejecute cada minuto.
-- IMPORTANTE: antes de correr esta migración, reemplazá los dos placeholders
-- de abajo (PROJECT_REF y SERVICE_ROLE_KEY) con los valores reales de tu
-- proyecto (Project Settings → API). Ver README para el paso a paso.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-due-notifications-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/send-due-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
