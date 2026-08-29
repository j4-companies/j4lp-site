create table if not exists public.property_intake_drafts (
  id uuid primary key default gen_random_uuid(),
  draft_key uuid not null unique default gen_random_uuid(),
  resume_token_hash text not null,
  email text not null,
  payload jsonb not null default '{}'::jsonb,
  current_step smallint not null default 0 check (current_step between 0 and 7),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'expired')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  submitted_intake_id uuid references public.property_intakes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.property_intake_files (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.property_intake_drafts(id) on delete cascade,
  intake_id uuid references public.property_intakes(id) on delete set null,
  storage_path text not null unique,
  original_name text not null,
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','image/heic','image/heif')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);
create table if not exists public.property_intake_access (
  intake_id uuid primary key references public.property_intakes(id) on delete cascade,
  view_token_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists property_intake_drafts_expiry_idx on public.property_intake_drafts (expires_at) where status = 'draft';
create index if not exists property_intake_files_intake_idx on public.property_intake_files (intake_id);
alter table public.property_intake_drafts enable row level security;
alter table public.property_intake_drafts force row level security;
alter table public.property_intake_files enable row level security;
alter table public.property_intake_files force row level security;
alter table public.property_intake_access enable row level security;
alter table public.property_intake_access force row level security;
revoke all on public.property_intake_drafts from anon, authenticated;
revoke all on public.property_intake_files from anon, authenticated;
revoke all on public.property_intake_access from anon, authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-intake-files', 'property-intake-files', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/heic','image/heif'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
