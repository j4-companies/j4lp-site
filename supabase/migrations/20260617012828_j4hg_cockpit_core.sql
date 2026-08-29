-- ============================================================
-- J4HG Cockpit (crm.j4lp.com) — core schema
-- User-authorized 2026-06-16: additive RLS-locked tables in the
-- existing "J4 Legacy Properties" project. Does NOT alter the
-- website's public lead form. CRM tables gated to 7 J4HG members.
-- ============================================================

create or replace function public.j4lp_crm_allowed()
returns boolean
language sql
stable
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
$$;

-- ---------- TRANSACTION COORDINATOR ----------
create table if not exists public.hg_deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_address text not null,
  mls_number text,
  side text default 'Listing',
  client_name text,
  client_email text,
  client_phone text,
  agent text,
  tc_owner text,
  status text default 'Pre-Contract',
  sale_price numeric,
  commission numeric,
  contract_date date,
  option_end date,
  financing_end date,
  appraisal_due date,
  closing_date date,
  title_company text,
  lender text,
  notes jsonb default '[]'::jsonb
);

create table if not exists public.hg_deal_tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.hg_deals(id) on delete cascade,
  label text not null,
  due_date date,
  assigned_to text,
  done boolean default false,
  sort_order int default 0,
  created_at timestamptz not null default now()
);
create index if not exists hg_deal_tasks_deal_idx on public.hg_deal_tasks(deal_id);

-- ---------- EOS: ROCKS ----------
create table if not exists public.hg_rocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  owner text,
  quarter text,
  due_date date,
  status text default 'On Track',
  progress int default 0,
  milestones jsonb default '[]'::jsonb,
  sort_order int default 0
);

-- ---------- EOS: SCORECARD ----------
create table if not exists public.hg_scorecard (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  unit text default 'number',
  ytd_actual numeric default 0,
  annual_goal numeric default 0,
  owner text,
  sort_order int default 0,
  updated_at timestamptz not null default now()
);

-- ---------- EOS: TO-DOS ----------
create table if not exists public.hg_todos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  text text not null,
  owner text,
  due_date date,
  done boolean default false
);

-- ---------- EOS: ISSUES ----------
create table if not exists public.hg_issues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  text text not null,
  raised_by text,
  priority int default 0,
  status text default 'Open',
  solved_at timestamptz
);

-- ---------- CHANGE REQUESTS ----------
create table if not exists public.hg_change_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  detail text,
  target text default 'Website',
  requested_by text,
  priority text default 'Normal',
  status text default 'New',
  resolved_at timestamptz
);

-- ---------- REMINDER LOG ----------
create table if not exists public.hg_reminders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text,
  ref_id uuid,
  sent_to text,
  subject text,
  sent_by text
);

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array[
    'hg_deals','hg_deal_tasks','hg_rocks','hg_scorecard',
    'hg_todos','hg_issues','hg_change_requests','hg_reminders'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists hg_member_all on public.%I;', t);
    execute format(
      'create policy hg_member_all on public.%I for all to authenticated using (public.j4lp_crm_allowed()) with check (public.j4lp_crm_allowed());',
      t
    );
  end loop;
end $$;;
