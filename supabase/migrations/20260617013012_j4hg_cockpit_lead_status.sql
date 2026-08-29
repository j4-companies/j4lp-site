-- Cockpit working-state for website leads, kept OUT of the production leads table.
-- One row per lead the team is working. lead_id mirrors leads.id (uuid).
-- The website's leads table is never written by the cockpit.
create table if not exists public.hg_lead_status (
  lead_id uuid primary key,
  status text default 'New',          -- New | Contacted | Qualified | Appt Set | Working | Won | Lost
  category text,                       -- Active | Nurture | Closed
  assigned_to text,                    -- J4HG agent
  priority text default 'Normal',      -- Low | Normal | High
  crm_notes jsonb default '[]'::jsonb,
  last_touch_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.hg_lead_status enable row level security;
drop policy if exists hg_member_all on public.hg_lead_status;
create policy hg_member_all on public.hg_lead_status
  for all to authenticated
  using (public.j4lp_crm_allowed())
  with check (public.j4lp_crm_allowed());;
