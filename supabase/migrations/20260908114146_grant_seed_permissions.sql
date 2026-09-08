CREATE EXTENSION IF NOT EXISTS pg_trgm;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE
  public.branches,
  public.cabinets,
  public.slots,
  public.swap_transactions
TO service_role;