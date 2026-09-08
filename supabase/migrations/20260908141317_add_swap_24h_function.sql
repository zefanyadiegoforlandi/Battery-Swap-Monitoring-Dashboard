CREATE OR REPLACE FUNCTION get_swap_count_24h(cabinet_ids TEXT[])
RETURNS TABLE (
  cabinet_id TEXT,
  swap_24h BIGINT
)
LANGUAGE SQL
AS $$
  SELECT
    s.cabinet_id,
    COUNT(*) AS swap_24h
  FROM swap_transactions s
  WHERE s.cabinet_id = ANY(cabinet_ids)
    AND s.swapped_at >= NOW() - INTERVAL '24 hours'
  GROUP BY s.cabinet_id;
$$;