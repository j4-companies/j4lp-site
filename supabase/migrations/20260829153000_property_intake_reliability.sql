alter table public.property_intake_drafts
  add column if not exists return_link_email_id text,
  add column if not exists return_link_sent_at timestamptz,
  add column if not exists return_link_attempted_at timestamptz,
  add column if not exists return_link_email_error text,
  add column if not exists return_link_attempt_count integer not null default 0,
  add column if not exists request_ip_hash text,
  add column if not exists return_link_delivery_status text,
  add column if not exists return_link_delivered_at timestamptz;

alter table public.property_intakes
  add column if not exists client_receipt_retry_count integer not null default 0,
  add column if not exists internal_alert_retry_count integer not null default 0,
  add column if not exists last_email_retry_at timestamptz,
  add column if not exists client_receipt_delivery_status text,
  add column if not exists internal_alert_delivery_status text,
  add column if not exists client_receipt_delivered_at timestamptz,
  add column if not exists internal_alert_delivered_at timestamptz,
  add column if not exists email_delivery_error text;

create table if not exists public.resend_webhook_events (
  event_id text primary key,
  email_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);

alter table public.resend_webhook_events enable row level security;
alter table public.resend_webhook_events force row level security;

create index if not exists property_intake_drafts_email_created_idx
  on public.property_intake_drafts (email, created_at desc);
create index if not exists property_intake_drafts_ip_created_idx
  on public.property_intake_drafts (request_ip_hash, created_at desc);
create index if not exists property_intakes_client_receipt_id_idx
  on public.property_intakes (client_receipt_id);
create index if not exists property_intakes_internal_alert_id_idx
  on public.property_intakes (internal_alert_id);

comment on column public.property_intake_drafts.return_link_sent_at is
  'Set only after Resend accepts the save-and-return message.';
comment on column public.property_intakes.last_email_retry_at is
  'Last reconciliation attempt for a missing client receipt or internal alert.';
