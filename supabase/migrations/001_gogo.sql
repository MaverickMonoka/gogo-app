create extension if not exists pgcrypto;
create table if not exists public.gogo_orders(
 id text primary key,
 customer_name text not null, phone text not null, email text, address text not null,
 fulfilment text not null check(fulfilment in ('Delivery','Collection')),
 items jsonb not null default '[]'::jsonb,
 subtotal_cents integer not null check(subtotal_cents>=0),
 delivery_cents integer not null check(delivery_cents>=0),
 total_cents integer not null check(total_cents>=0),
 status text not null default 'payment_pending',
 payment_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists gogo_orders_payment_idx on public.gogo_orders(payment_id);
create index if not exists gogo_orders_created_idx on public.gogo_orders(created_at desc);
create table if not exists public.gogo_payment_events(
 id uuid primary key default gen_random_uuid(), event_type text not null, payment_id uuid,
 order_id text, payload jsonb not null, created_at timestamptz not null default now(),
 unique(event_type,payment_id)
);
alter table public.gogo_orders enable row level security;
alter table public.gogo_payment_events enable row level security;
revoke all on table public.gogo_orders from anon,authenticated;
revoke all on table public.gogo_payment_events from anon,authenticated;
