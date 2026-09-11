DROP FUNCTION IF EXISTS get_hourly_swap_count(TEXT);

CREATE FUNCTION get_hourly_swap_count(
    p_cabinet_id TEXT
)
RETURNS TABLE (
    hour TIMESTAMPTZ,
    total BIGINT
)
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
    SELECT
        date_trunc('hour', hours.hour) AS hour,
        COUNT(s.id) AS total
    FROM generate_series(
        date_trunc('hour', NOW() - INTERVAL '23 hours'),
        date_trunc('hour', NOW()),
        INTERVAL '1 hour'
    ) AS hours(hour)
    LEFT JOIN swap_transactions s
        ON s.cabinet_id = p_cabinet_id
        AND s.swapped_at >= hours.hour
        AND s.swapped_at < hours.hour + INTERVAL '1 hour'
    GROUP BY hours.hour
    ORDER BY hours.hour;
$$;

GRANT EXECUTE ON FUNCTION get_hourly_swap_count(TEXT)
    TO service_role;