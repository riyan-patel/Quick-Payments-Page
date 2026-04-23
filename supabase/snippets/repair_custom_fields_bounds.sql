-- Run in Supabase Dashboard → SQL → New query, then Run.
-- Fixes: Could not find the 'max_value' column of 'custom_fields' in the schema cache

alter table public.custom_fields
  add column if not exists min_value numeric,
  add column if not exists max_value numeric;

comment on column public.custom_fields.min_value is 'When field_type is number, inclusive minimum (optional).';
comment on column public.custom_fields.max_value is 'When field_type is number, inclusive maximum (optional).';

-- Required so PostgREST (Supabase Data API) picks up the new columns.
notify pgrst, 'reload schema';

-- Optional: confirm columns (should list min_value, max_value)
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'custom_fields'
-- order by ordinal_position;
