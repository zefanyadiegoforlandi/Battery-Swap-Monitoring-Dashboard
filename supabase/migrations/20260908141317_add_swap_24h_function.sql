CREATE OR REPLACE FUNCTION get_swap_count_24h(cabinet_ids TEXT[])
RETURNS TABLE (
    cabinet_id TEXT,
    swap_24h BIGINT
)
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
    SELECT
        s.cabinet_id,
        COUNT(*) AS swap_24h
    FROM swap_transactions s
    WHERE s.cabinet_id = ANY(cabinet_ids)
        AND s.swapped_at >= NOW() - INTERVAL '24 hours'
    GROUP BY s.cabinet_id;
$$;

DROP FUNCTION IF EXISTS search_cabinets(TEXT, TEXT, TEXT, INTEGER, INTEGER);

CREATE FUNCTION search_cabinets(
    p_q        TEXT DEFAULT NULL,
    p_status   TEXT DEFAULT NULL,
    p_sort_dir TEXT DEFAULT 'desc',
    p_limit    INTEGER DEFAULT 10,
    p_offset   INTEGER DEFAULT 0
)
RETURNS TABLE (
    id                TEXT,
    code              TEXT,
    branch_name       TEXT,
    status            TEXT,
    occupied_slots    BIGINT,
    total_slots       INTEGER,
    swap_24h          BIGINT,
    last_heartbeat_at TIMESTAMPTZ,
    total_count       BIGINT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT
            c.id,
            c.code,
            b.name AS branch_name,
            c.status,
            c.total_slots,
            c.last_heartbeat_at
        FROM cabinets c
        JOIN branches b ON b.id = c.branch_id
        WHERE
            (p_status IS NULL OR p_status = '' OR c.status = p_status)
            AND (
                p_q IS NULL OR p_q = ''
                OR c.code ILIKE '%' || p_q || '%'
                OR b.name ILIKE '%' || p_q || '%'
            )
    ),
    slot_agg AS (
        SELECT
            s.cabinet_id,
            COUNT(*) FILTER (
                WHERE s.state IN ('CHARGING', 'FULL')
            ) AS occupied_slots        
        FROM slots s
        WHERE s.cabinet_id IN (SELECT filtered.id FROM filtered)
        GROUP BY s.cabinet_id
    ),
    swap_agg AS (
        SELECT
            st.cabinet_id,
            COUNT(*) AS swap_24h
        FROM swap_transactions st
        WHERE st.cabinet_id IN (SELECT filtered.id FROM filtered)
            AND st.swapped_at >= NOW() - INTERVAL '24 hours'
        GROUP BY st.cabinet_id
    ),
    combined AS (
        SELECT
            f.id,
            f.code,
            f.branch_name,
            f.status,
            COALESCE(sa.occupied_slots, 0) AS occupied_slots,
            f.total_slots,
            COALESCE(wa.swap_24h, 0) AS swap_24h,
            f.last_heartbeat_at
        FROM filtered f
        LEFT JOIN slot_agg sa ON sa.cabinet_id = f.id
        LEFT JOIN swap_agg wa ON wa.cabinet_id = f.id
    )
    SELECT
        c.id,
        c.code,
        c.branch_name,
        c.status,
        c.occupied_slots,
        c.total_slots,
        c.swap_24h,
        c.last_heartbeat_at,
        COUNT(*) OVER() AS total_count
    FROM combined c
    ORDER BY
        CASE WHEN p_sort_dir = 'asc' THEN c.swap_24h END ASC,
        CASE WHEN p_sort_dir != 'asc' THEN c.swap_24h END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_swap_count_24h(TEXT[])
    TO service_role;

GRANT EXECUTE ON FUNCTION search_cabinets(TEXT, TEXT, TEXT, INTEGER, INTEGER)
    TO service_role;