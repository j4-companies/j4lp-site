-- User-directed 2026-06-16: restrict lead visibility to the two team leads
-- (Cuatro + Stephanie). Agents keep the cockpit but not the raw lead list.
-- One function = the single place to change who can see leads later.
create or replace function public.j4lp_leads_visible()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') in (
    'cuatro@j4lp.com',
    'stephanie@j4lp.com'
  );
$$;

-- Website leads: read-only, now limited to the two leads.
drop policy if exists hg_member_read_leads on public.leads;
create policy hg_member_read_leads on public.leads
  for select to authenticated
  using (public.j4lp_leads_visible());

-- Lead working-state: same two-person gate.
drop policy if exists hg_member_all on public.hg_lead_status;
create policy hg_member_all on public.hg_lead_status
  for all to authenticated
  using (public.j4lp_leads_visible())
  with check (public.j4lp_leads_visible());;
