-- Optional bounds for custom_fields when field_type = 'number'
alter table public.custom_fields
  add column if not exists min_value numeric,
  add column if not exists max_value numeric;

comment on column public.custom_fields.min_value is 'When field_type is number, inclusive minimum (optional).';
comment on column public.custom_fields.max_value is 'When field_type is number, inclusive maximum (optional).';
