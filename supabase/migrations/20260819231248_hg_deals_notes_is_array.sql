alter table hg_deals add constraint hg_deals_notes_is_array check (jsonb_typeof(notes) = 'array');;
