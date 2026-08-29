-- J4LP rural-property intake.
-- Public visitors never write to this table directly. The dedicated Edge
-- Function validates the intake and writes with the service role.

create table if not exists public.property_intakes (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid not null unique,
  reference text not null unique,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'contacted', 'appointment_set', 'closed', 'archived', 'test')),
  is_test boolean not null default false,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  request_type text not null,
  property_address text not null,
  nearest_town text not null,
  county text not null,
  acreage text not null,
  property_type text not null,
  residence_status text not null,
  timeline text not null,
  is_1031 text not null,
  exchange_role text,
  agent_relationship text not null,
  selected_agent text,
  outside_agent_name text,
  assigned_agent_email text,
  supervisor_email text,
  contact_permissions text[] not null default '{}',
  resource_interests text[] not null default '{}',
  payload jsonb not null,
  source_url text,
  user_agent text,
  request_ip_hash text,
  internal_notes text,
  client_receipt_id text,
  internal_alert_id text,
  client_receipt_sent_at timestamptz,
  internal_alert_sent_at timestamptz,
  email_error text
);
create index if not exists property_intakes_submitted_at_idx
  on public.property_intakes (submitted_at desc);
create index if not exists property_intakes_status_idx
  on public.property_intakes (status, submitted_at desc);
create index if not exists property_intakes_email_idx
  on public.property_intakes (lower(email), submitted_at desc);
create index if not exists property_intakes_agent_idx
  on public.property_intakes (assigned_agent_email, submitted_at desc);
create index if not exists property_intakes_county_idx
  on public.property_intakes (county, submitted_at desc);
alter table public.property_intakes enable row level security;
alter table public.property_intakes force row level security;
revoke all on table public.property_intakes from anon, authenticated;
grant select on table public.property_intakes to authenticated;
grant update (status, internal_notes, assigned_agent_email, updated_at)
  on table public.property_intakes to authenticated;
drop policy if exists property_intakes_assigned_read on public.property_intakes;
create policy property_intakes_assigned_read on public.property_intakes
  for select to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'cuatro@j4lp.com',
      'stephanie@j4lp.com'
    )
    or lower(coalesce(assigned_agent_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or lower(coalesce(supervisor_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
drop policy if exists property_intakes_assigned_update on public.property_intakes;
create policy property_intakes_assigned_update on public.property_intakes
  for update to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'cuatro@j4lp.com',
      'stephanie@j4lp.com'
    )
    or lower(coalesce(assigned_agent_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or lower(coalesce(supervisor_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'cuatro@j4lp.com',
      'stephanie@j4lp.com'
    )
    or lower(coalesce(assigned_agent_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or lower(coalesce(supervisor_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
drop trigger if exists set_updated_at on public.property_intakes;
create trigger set_updated_at before update on public.property_intakes
  for each row execute function public.set_updated_at();
