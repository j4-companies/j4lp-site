-- J4 Legacy Properties — Leads Table
-- Run this in Supabase SQL Editor

create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  form_type text not null,
  name text,
  phone text,
  email text,
  buyer_type text,
  budget text,
  timeline text,
  counties text,
  message text,
  property_ref text,
  agent_ref text,
  license_status text,
  experience text,
  property_type text,
  county text,
  acreage text,
  intent text,
  raw jsonb
);

-- Index on email and created_at for easy searching
create index if not exists leads_email_idx on leads(email);
create index if not exists leads_created_idx on leads(created_at desc);

-- Row Level Security — service role only
alter table leads enable row level security;

create policy "Service role full access"
  on leads
  for all
  to service_role
  using (true)
  with check (true);
