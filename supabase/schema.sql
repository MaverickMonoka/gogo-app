-- Run in the GoGo Supabase SQL editor. Keep the service-role key server-side only.
create table if not exists public.gogo_orders (
 id text primary key,
 customer_name text not null,
 phone text not null,
 email text,
 address text not null,
 fulfilment text not null check (fulfilment in ('Delivery','Collection')),
 items jsonb not null,
 subtotal_cents integer not null check (subtotal_cents>=0),
 delivery_cents integer not null check (delivery_cents>=0),
 total_cents integer not null check (total_cents>=0),
 status text not null default 'payment_pending',
 payment_id text,
 created_at timestamptz not null default now()
);
create index if not exists gogo_orders_created_at_idx on public.gogo_orders(created_at desc);
alter table public.gogo_orders enable row level security;
-- No public read/write policies. Only server-side service-role may access orders.

-- Dispatch fields for merchant and driver dashboards.
alter table public.gogo_orders add column if not exists driver_name text;
alter table public.gogo_orders add column if not exists driver_phone text;
