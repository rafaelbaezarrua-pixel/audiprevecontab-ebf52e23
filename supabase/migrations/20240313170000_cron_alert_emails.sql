-- Enable pg_cron and pg_net extensions if not already enabled
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Set up cron job to invoke the edge function every day at 8:00 AM UTC (5:00 AM BRT)
SELECT cron.schedule(
  'send-alert-email-cron', -- cron job name
  '0 8 * * *', -- Everyday at 08:00 UTC
  $$
    select net.http_post(
      url:='https://coymrdvxyznmldojvwfo.supabase.co/functions/v1/send-alert-email',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Note: to remove the job:
-- SELECT cron.unschedule('send-alert-email-cron');
