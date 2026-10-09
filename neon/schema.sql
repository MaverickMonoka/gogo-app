-- Run in Neon SQL Editor before enabling GoGo ordering.
CREATE TABLE IF NOT EXISTS gogo_orders (
 id text PRIMARY KEY,
 customer_name text NOT NULL,
 phone text NOT NULL,
 email text,
 address text NOT NULL,
 fulfilment text NOT NULL CHECK (fulfilment IN ('Delivery','Collection')),
 items jsonb NOT NULL,
 subtotal_cents integer NOT NULL CHECK(subtotal_cents>=0),
 delivery_cents integer NOT NULL CHECK(delivery_cents>=0),
 total_cents integer NOT NULL CHECK(total_cents>=0),
 status text NOT NULL DEFAULT 'payment_pending',
 payment_id text,
 driver_name text,
 driver_phone text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gogo_orders_created_at_idx ON gogo_orders(created_at DESC);
