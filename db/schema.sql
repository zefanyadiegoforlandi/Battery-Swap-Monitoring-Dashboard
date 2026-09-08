DROP TABLE IF EXISTS swap_transactions CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS cabinets CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE branches (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE cabinets (
  id                TEXT PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  branch_id         TEXT NOT NULL REFERENCES branches(id),
  status            TEXT NOT NULL CHECK (
    status IN ('ONLINE', 'OFFLINE', 'MAINTENANCE')
  ),
  total_slots       INTEGER NOT NULL DEFAULT 12 CHECK (total_slots > 0),
  last_heartbeat_at TIMESTAMPTZ
);

CREATE TABLE slots (
  id          TEXT PRIMARY KEY,
  cabinet_id  TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 12),
  state       TEXT NOT NULL CHECK (
    state IN ('EMPTY', 'CHARGING', 'FULL', 'LOCKED', 'FAULT')
  ),
  soc_percent INTEGER CHECK (soc_percent BETWEEN 0 AND 100),
  UNIQUE (cabinet_id, slot_number)
);

CREATE TABLE swap_transactions (
  id          TEXT PRIMARY KEY,
  cabinet_id  TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 12),
  swapped_at  TIMESTAMPTZ NOT NULL,
  battery_id  TEXT NOT NULL
);

CREATE INDEX idx_cabinets_branch
  ON cabinets(branch_id);

CREATE INDEX idx_cabinets_status
  ON cabinets(status);

CREATE INDEX idx_swaps_cabinet_time
  ON swap_transactions(cabinet_id, swapped_at DESC);

CREATE INDEX idx_swaps_time
  ON swap_transactions(swapped_at DESC);

CREATE INDEX idx_cabinets_code_trgm
  ON cabinets USING gin (code gin_trgm_ops);

CREATE INDEX idx_branches_name_trgm
  ON branches USING gin (name gin_trgm_ops);