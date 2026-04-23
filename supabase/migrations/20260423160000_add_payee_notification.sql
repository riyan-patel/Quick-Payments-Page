-- Optional override for where to send "you received a payment" emails; separate subject/body from payer template.
alter table public.payment_pages
  add column if not exists payee_notification_email text,
  add column if not exists email_payee_subject text,
  add column if not exists email_payee_body_html text;

comment on column public.payment_pages.payee_notification_email is
  'If set, receive payment notifications at this address; otherwise use the page creator’s auth email.';
