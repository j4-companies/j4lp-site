-- Daily TC deadline reminder job. Runs 12:00 UTC (7am CDT / 6am CST),
-- POSTs to the daily-deal-reminders edge function with the cron token.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'daily-deal-reminders',
  '0 12 * * *',
  $job$
    select net.http_post(
      url := 'https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/daily-deal-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-token', '43ccfd6af80d4790970781464541ec458eac3fbdf3473c37'
      ),
      body := '{}'::jsonb
    );
  $job$
);;
