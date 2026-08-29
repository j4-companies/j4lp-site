-- Extend hg_deals to cover the listing phase (most J4LP inventory is active listings,
-- not yet under contract). Contract-phase columns already exist.
alter table public.hg_deals add column if not exists list_date date;
alter table public.hg_deals add column if not exists listing_expiration date;
alter table public.hg_deals add column if not exists list_price numeric;;
