-- Secondary accent for gradients / public page theming (pairs with brand_color)
alter table public.payment_pages
  add column if not exists brand_color_secondary text not null default '#f59e0b';

comment on column public.payment_pages.brand_color_secondary is 'Second brand hex (#rrggbb) for accents and gradients on the public pay page.';
