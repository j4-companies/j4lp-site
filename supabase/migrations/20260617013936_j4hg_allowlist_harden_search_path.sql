-- Pin search_path on the allowlist function (security linter hardening).
create or replace function public.j4lp_crm_allowed()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') in (
    'cuatro@j4lp.com',
    'stephanie@j4lp.com',
    'mason@j4lp.com',
    'rozanna@j4lp.com',
    'harleigh@j4lp.com',
    'kayla@j4lp.com',
    'julia@j4lp.com'
  );
$$;;
