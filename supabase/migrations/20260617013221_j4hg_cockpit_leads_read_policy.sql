-- User-authorized 2026-06-16: read-only, members-only SELECT policy on the
-- website leads table. Additive — existing anon/service insert policies untouched.
-- The cockpit can READ website leads but never insert/update/delete them.
drop policy if exists hg_member_read_leads on public.leads;
create policy hg_member_read_leads on public.leads
  for select to authenticated
  using (public.j4lp_crm_allowed());;
