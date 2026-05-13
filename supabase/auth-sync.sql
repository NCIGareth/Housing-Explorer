-- =============================================================
-- Run this in Supabase SQL Editor to set up:
--   1. Auth sync trigger (auth.users -> public.User)
--   2. pg_cron for alert dispatch
--   3. Alert dispatch function
-- =============================================================

-- 1. Create public.User row when someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public."User" (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Enable extensions
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 3. Alert dispatch via HTTP call to your app's dispatch endpoint
--    (falls back to no-op if DISPATCH_URL is not set)
create or replace function public.dispatch_alerts()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Calls the app's alert dispatch endpoint.
  -- Set dispatch_api_key to a shared secret in Supabase dashboard -> Settings -> Environment.
  -- The endpoint should accept ?key=<secret> for cron-triggered dispatches.
  perform extensions.net.http_post(
    url := current_setting('app.dispatch_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(current_setting('app.dispatch_api_key', true), '')
    ),
    body := '{}'::jsonb
  );
end;
$$;

-- 4. Schedule every hour
select cron.schedule('dispatch-alerts-hourly', '0 * * * *', 'select public.dispatch_alerts();');
