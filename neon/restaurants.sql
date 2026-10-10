CREATE TABLE IF NOT EXISTS gogo_restaurants (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name text NOT NULL, area text NOT NULL, address text NOT NULL,
 contact_name text NOT NULL, contact_phone text NOT NULL,
 cuisine text NOT NULL DEFAULT 'Other', description text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','suspended')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gogo_menu_items (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 restaurant_id bigint NOT NULL REFERENCES gogo_restaurants(id),
 name text NOT NULL, description text NOT NULL DEFAULT '',
 price_cents integer NOT NULL CHECK(price_cents >= 0),
 available boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gogo_menu_restaurant_idx ON gogo_menu_items(restaurant_id);
CREATE TABLE IF NOT EXISTS gogo_restaurant_orders (
 id text PRIMARY KEY, restaurant_id bigint NOT NULL REFERENCES gogo_restaurants(id),
 customer_name text NOT NULL, customer_phone text NOT NULL,
 delivery_address text NOT NULL, items jsonb NOT NULL,
 subtotal_cents integer NOT NULL, delivery_cents integer NOT NULL,
 total_cents integer NOT NULL,
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','accepted','preparing','ready','out_for_delivery','delivered','cancelled')),
 payment_status text NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','pending','paid','refunded')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gogo_restaurant_orders_idx ON gogo_restaurant_orders(restaurant_id,created_at DESC);
