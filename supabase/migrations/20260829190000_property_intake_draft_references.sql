alter table public.property_intake_drafts
  add column if not exists draft_reference text;

update public.property_intake_drafts
set draft_reference = 'DRAFT-' || to_char(created_at at time zone 'UTC', 'YYMMDD') || '-' || upper(left(replace(draft_key::text, '-', ''), 6))
where draft_reference is null;

alter table public.property_intake_drafts
  alter column draft_reference set not null;

create unique index if not exists property_intake_drafts_reference_idx
  on public.property_intake_drafts (draft_reference);

comment on column public.property_intake_drafts.draft_reference is
  'Friendly support reference only. A resume token is still required to read or change a draft.';
