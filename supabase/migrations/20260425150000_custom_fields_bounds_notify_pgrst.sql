-- Idempotent: safe if you already added columns by hand. PostgREST must reload its
-- schema cache after new columns or inserts/selects with min_value/max_value fail with
-- "Could not find the 'max_value' column of 'custom_fields' in the schema cache".
alter table public.custom_fields
  add column if not exists min_value numeric,
  add column if not exists max_value numeric;

comment on column public.custom_fields.min_value is 'When field_type is number, inclusive minimum (optional).';
comment on column public.custom_fields.max_value is 'When field_type is number, inclusive maximum (optional).';

notify pgrst, 'reload schema';
