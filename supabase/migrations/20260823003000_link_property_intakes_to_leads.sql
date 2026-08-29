-- Link rural-property intakes to the owner-controlled J4LP CRM.
-- Matching is deterministic but intentionally non-unique: historical duplicates
-- are flagged for human review instead of being merged automatically.

alter table public.leads
  add column if not exists email_normalized text,
  add column if not exists phone_normalized text;
create or replace function public.set_lead_match_keys()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email_normalized := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.phone_normalized := nullif(right(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), 10), '');
  return new;
end;
$$;
update public.leads
set
  email_normalized = nullif(lower(btrim(coalesce(email, ''))), ''),
  phone_normalized = nullif(right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10), '');
drop trigger if exists set_lead_match_keys on public.leads;
create trigger set_lead_match_keys
  before insert or update of email, phone on public.leads
  for each row execute function public.set_lead_match_keys();
create index if not exists leads_email_normalized_idx
  on public.leads (email_normalized) where email_normalized is not null;
create index if not exists leads_phone_normalized_idx
  on public.leads (phone_normalized) where phone_normalized is not null;
alter table public.property_intakes
  add column if not exists lead_id uuid references public.leads(id) on delete set null,
  add column if not exists crm_match_method text
    check (crm_match_method in ('email', 'phone', 'created')),
  add column if not exists crm_synced_at timestamptz,
  add column if not exists crm_sync_error text;
create index if not exists property_intakes_lead_id_idx
  on public.property_intakes (lead_id, submitted_at desc);
-- The CRM may show only the match result, never the hash or unneeded private fields.
grant select (id, lead_id, reference, submitted_at, status, is_test,
  request_type, property_address, nearest_town, county, acreage,
  property_type, residence_status, timeline, is_1031,
  selected_agent, crm_match_method, crm_synced_at, crm_sync_error)
  on public.property_intakes to authenticated;
