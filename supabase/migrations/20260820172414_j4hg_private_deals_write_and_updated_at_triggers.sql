-- 1. Private DEALS get their own gate, open to all J4HG.
--    Leads and hg_lead_status stay on j4lp_leads_visible() (Cuatro + Stephanie only).
create or replace function public.j4lp_private_deals_visible()
returns boolean language sql stable set search_path to '' as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') in (
    'cuatro@j4lp.com',
    'stephanie@j4lp.com',
    'mason@j4lp.com',
    'rozanna@j4lp.com',
    'harleigh@j4lp.com',
    'kayla@j4lp.com',
    'julia@j4lp.com'
  );
$$;

drop policy if exists hg_member_all on public.hg_deals;
create policy hg_member_all on public.hg_deals for all to authenticated
using      (public.j4lp_crm_allowed() and ((private = false) or public.j4lp_private_deals_visible()))
with check (public.j4lp_crm_allowed() and ((private = false) or public.j4lp_private_deals_visible()));

drop policy if exists hg_member_all on public.hg_deal_tasks;
create policy hg_member_all on public.hg_deal_tasks for all to authenticated
using (
  public.j4lp_crm_allowed() and exists (
    select 1 from public.hg_deals d
    where d.id = hg_deal_tasks.deal_id
      and ((d.private = false) or public.j4lp_private_deals_visible())))
with check (
  public.j4lp_crm_allowed() and exists (
    select 1 from public.hg_deals d
    where d.id = hg_deal_tasks.deal_id
      and ((d.private = false) or public.j4lp_private_deals_visible())));

-- 2. updated_at stops lying: maintain it in the database, not the app.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path to '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.hg_deals;
create trigger set_updated_at before update on public.hg_deals
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.hg_lead_status;
create trigger set_updated_at before update on public.hg_lead_status
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.hg_rocks;
create trigger set_updated_at before update on public.hg_rocks
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.hg_scorecard;
create trigger set_updated_at before update on public.hg_scorecard
  for each row execute function public.set_updated_at();;
