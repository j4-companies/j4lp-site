alter table public.hg_deals add column if not exists files_url text;
comment on column public.hg_deals.files_url is 'Link to the deal''s canonical file location (e.g. the Dropbox listing folder share link). The Cockpit indexes files; it does not store them.';;
