-- Private-deal flag: a deal marked private is visible/editable only by the two leads
-- (Cuatro + Stephanie), like leads. Normal deals stay visible to all 7 J4HG members.
alter table public.hg_deals add column if not exists private boolean not null default false;

drop policy if exists hg_member_all on public.hg_deals;
create policy hg_member_all on public.hg_deals
  for all to authenticated
  using (public.j4lp_crm_allowed() and (private = false or public.j4lp_leads_visible()))
  with check (public.j4lp_crm_allowed() and (private = false or public.j4lp_leads_visible()));

-- Tasks of a private deal inherit the restriction.
drop policy if exists hg_member_all on public.hg_deal_tasks;
create policy hg_member_all on public.hg_deal_tasks
  for all to authenticated
  using (
    public.j4lp_crm_allowed() and exists (
      select 1 from public.hg_deals d
      where d.id = hg_deal_tasks.deal_id
        and (d.private = false or public.j4lp_leads_visible())
    )
  )
  with check (
    public.j4lp_crm_allowed() and exists (
      select 1 from public.hg_deals d
      where d.id = hg_deal_tasks.deal_id
        and (d.private = false or public.j4lp_leads_visible())
    )
  );;
