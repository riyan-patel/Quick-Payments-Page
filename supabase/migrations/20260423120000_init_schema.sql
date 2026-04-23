-- Quick Payment Pages (QPP) — initial schema
-- Run in Supabase SQL Editor or via: supabase db push

create extension if not exists "pgcrypto";

-- ─── payment_pages ─────────────────────────────────────────────
create table public.payment_pages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  title text not null,
  subtitle text,
  header_message text,
  footer_message text,
  -- Product differentiator: short trust / transparency copy shown to payers
  trust_panel text,
  logo_url text,
  brand_color text not null default '#0f766e',
  brand_color_secondary text not null default '#f59e0b',
  amount_mode text not null check (amount_mode in ('fixed', 'range', 'open')),
  fixed_amount numeric(12, 2),
  min_amount numeric(12, 2),
  max_amount numeric(12, 2),
  gl_codes text[] not null default '{}'::text[],
  is_active boolean not null default true,
  email_subject text,
  email_body_html text,
  constraint payment_pages_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint payment_pages_amounts_fixed check (
    amount_mode <> 'fixed' or fixed_amount is not null
  ),
  constraint payment_pages_amounts_range check (
    amount_mode <> 'range' or (min_amount is not null and max_amount is not null and min_amount <= max_amount)
  )
);

create index payment_pages_created_by_idx on public.payment_pages (created_by);

-- ─── custom_fields (max 10 enforced in app) ───────────────────
create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.payment_pages (id) on delete cascade,
  label text not null,
  field_type text not null check (
    field_type in ('text', 'number', 'dropdown', 'date', 'checkbox')
  ),
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  placeholder text,
  helper_text text,
  sort_order int not null default 0
);

create index custom_fields_page_id_idx on public.custom_fields (page_id);

-- ─── transactions ──────────────────────────────────────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_id uuid not null references public.payment_pages (id) on delete restrict,
  amount numeric(12, 2) not null,
  currency text not null default 'usd',
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  payment_method_type text,
  payer_email text,
  payer_name text,
  stripe_payment_intent_id text unique,
  gl_codes_snapshot text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb
);

create index transactions_page_id_idx on public.transactions (page_id);
create index transactions_created_at_idx on public.transactions (created_at desc);

-- ─── field_responses ───────────────────────────────────────────
create table public.field_responses (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  field_id uuid references public.custom_fields (id) on delete set null,
  field_label_snapshot text not null,
  value text not null
);

create index field_responses_transaction_id_idx on public.field_responses (transaction_id);

-- ─── updated_at trigger ────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger payment_pages_set_updated_at
before update on public.payment_pages
for each row execute procedure public.set_updated_at();

-- ─── RLS ───────────────────────────────────────────────────────
alter table public.payment_pages enable row level security;
alter table public.custom_fields enable row level security;
alter table public.transactions enable row level security;
alter table public.field_responses enable row level security;

-- payment_pages: owners full access
create policy "payment_pages_owner_all"
on public.payment_pages
for all
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

-- payment_pages: public read active (for /pay/[slug])
create policy "payment_pages_public_read_active"
on public.payment_pages
for select
to anon, authenticated
using (is_active = true);

-- custom_fields: owners CRUD via parent page
create policy "custom_fields_owner_all"
on public.custom_fields
for all
to authenticated
using (
  exists (
    select 1 from public.payment_pages p
    where p.id = custom_fields.page_id
      and p.created_by = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.payment_pages p
    where p.id = custom_fields.page_id
      and p.created_by = (select auth.uid())
  )
);

-- custom_fields: public read when page active
create policy "custom_fields_public_read"
on public.custom_fields
for select
to anon, authenticated
using (
  exists (
    select 1 from public.payment_pages p
    where p.id = custom_fields.page_id and p.is_active = true
  )
);

-- transactions: owners read only (writes via service role API)
create policy "transactions_owner_select"
on public.transactions
for select
to authenticated
using (
  exists (
    select 1 from public.payment_pages p
    where p.id = transactions.page_id
      and p.created_by = (select auth.uid())
  )
);

-- field_responses: owners read
create policy "field_responses_owner_select"
on public.field_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.transactions t
    join public.payment_pages p on p.id = t.page_id
    where t.id = field_responses.transaction_id
      and p.created_by = (select auth.uid())
  )
);
