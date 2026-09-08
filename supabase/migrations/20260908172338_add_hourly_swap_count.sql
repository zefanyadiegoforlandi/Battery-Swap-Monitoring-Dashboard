CREATE OR REPLACE FUNCTION get_hourly_swap_count(
    cabinet_id TEXT
)
RETURNS TABLE (
    hour TIMESTAMPTZ,
    total BIGINT
)
LANGUAGE SQL
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
        ON s.cabinet_id = cabinet_id
        AND s.swapped_at >= hours.hour
        AND s.swapped_at < hours.hour + INTERVAL '1 hour'
    GROUP BY hours.hour
    ORDER BY hours.hour;
$$;