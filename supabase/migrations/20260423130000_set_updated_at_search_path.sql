-- Security advisor: lock search_path on trigger function
alter function public.set_updated_at() set search_path = public;
