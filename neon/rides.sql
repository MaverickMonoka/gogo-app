-- Run this after neon/schema.sql in the same Neon branch.
CREATE TABLE IF NOT EXISTS gogo_rides (
 id text PRIMARY KEY,
 booking_type text NOT NULL CHECK (booking_type IN ('now','scheduled')),
 rider_name text NOT NULL,
 rider_phone text NOT NULL,
 pickup text NOT NULL,
 destination text NOT NULL,
 pickup_at timestamptz NOT NULL,
 passengers integer NOT NULL DEFAULT 1 CHECK(passengers BETWEEN 1 AND 12),
 vehicle_type text NOT NULL DEFAULT 'car' CHECK(vehicle_type IN ('car','shuttle')),
 lodge_name text,
 notes text,
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','accepted','arriving','in_progress','completed','cancelled')),
 driver_name text,
 driver_phone text,
 fare_cents integer,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gogo_rides_pickup_idx ON gogo_rides(pickup_at,status);
CREATE TABLE IF NOT EXISTS gogo_lodge_partners (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name text NOT NULL,
 contact_name text NOT NULL,
 contact_phone text NOT NULL,
 area text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','suspended')),
 created_at timestamptz NOT NULL DEFAULT now()
);
