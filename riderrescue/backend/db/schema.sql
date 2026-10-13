-- RiderRescue — PostgreSQL schema
-- Run: psql "$DATABASE_URL" -f db/schema.sql
-- gen_random_uuid() is built-in in Postgres 13+ and PGlite
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────── users ─────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        VARCHAR(20)  NOT NULL,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(254) NOT NULL,
  phone          VARCHAR(20)  NOT NULL,
  nid_number     VARCHAR(17)  NOT NULL,
  password_hash  TEXT         NOT NULL,
  role           VARCHAR(10)  NOT NULL CHECK (role IN ('member','provider','admin')),
  status         VARCHAR(10)  NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','pending','restricted')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- user_id may never contain "@" so that "User ID or Email" login is unambiguous
  CONSTRAINT users_user_id_format CHECK (user_id ~ '^[A-Za-z0-9_]{4,20}$')
);

-- Case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_key ON users (LOWER(user_id));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key   ON users (LOWER(email));
CREATE INDEX        IF NOT EXISTS users_role_status ON users (role, status);

-- ───────────────────── provider_profiles ─────────────────────
CREATE TABLE IF NOT EXISTS provider_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  shop_name             VARCHAR(150) NOT NULL,
  trade_license_number  VARCHAR(50)  NOT NULL,
  service_type          VARCHAR(10)  NOT NULL CHECK (service_type IN ('fuel','rescue','workshop')),
  service_details       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  average_rating        NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (average_rating BETWEEN 0 AND 5),
  is_approved           BOOLEAN      NOT NULL DEFAULT FALSE,
  reviewed_by           UUID REFERENCES users(id),
  reviewed_at           TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_trade_license_key ON provider_profiles (LOWER(trade_license_number));
CREATE INDEX IF NOT EXISTS provider_type_approved ON provider_profiles (service_type, is_approved);

-- ───────────────────── service_requests ─────────────────────
CREATE TABLE IF NOT EXISTS service_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id   UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  service_type  VARCHAR(10) NOT NULL CHECK (service_type IN ('fuel','rescue','workshop')),
  status        VARCHAR(12) NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested','accepted','in_progress','completed','cancelled')),
  details       JSONB       NOT NULL DEFAULT '{}'::jsonb,   -- grade/litres, vehicle/location, issue/etc.
  total_amount  NUMERIC(10,2) CHECK (total_amount >= 0),
  rating        SMALLINT    CHECK (rating BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS requests_provider_status ON service_requests (provider_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_member          ON service_requests (member_id, created_at DESC);
