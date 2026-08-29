-- Short manual "needs attention" flag shown as a red chip on the deal card.
-- Computed flags (expired, closing soon, overdue, missing price) are derived in the UI.
alter table public.hg_deals add column if not exists attention text;;
