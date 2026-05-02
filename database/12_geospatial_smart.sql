-- ==========================================================
-- FleetIQ  —  Geospatial & Smart Intelligence Extensions
-- ==========================================================
-- Adds three database-level features used by the API layer:
--
--   1. warehouses_within_radius()  — PostGIS ST_DWithin proximity search
--   2. predict_shipment_delay()    — risk score from driver history vs deadline
--   3. warehouse_load_forecast_view — pending-inbound count per warehouse
-- ==========================================================


-- ── 1. Proximity Search ─────────────────────────────────────
-- Returns every warehouse within p_km kilometres of a given
-- lat/lng point, ordered nearest-first.
-- Uses ST_DWithin for index-assisted radius filtering (fast on
-- a GiST index on the geography column), then returns the exact
-- ST_Distance for display.

CREATE OR REPLACE FUNCTION warehouses_within_radius(
    p_lat    NUMERIC,
    p_lng    NUMERIC,
    p_km     NUMERIC,
    p_org_id INT
)
RETURNS TABLE (
    warehouse_id   INT,
    name           TEXT,
    city           TEXT,
    address        TEXT,
    capacity_units INT,
    current_load   INT,
    distance_km    NUMERIC
)
LANGUAGE sql STABLE AS $$
    SELECT
        w.warehouse_id,
        w.name,
        w.city,
        w.address,
        w.capacity_units,
        w.current_load,
        ROUND(
            (ST_Distance(
                w.location,
                ST_MakePoint(p_lng, p_lat)::geography
            ) / 1000)::NUMERIC,
        2) AS distance_km
    FROM warehouses w
    WHERE w.org_id = p_org_id
      AND w.location IS NOT NULL
      AND ST_DWithin(
              w.location,
              ST_MakePoint(p_lng, p_lat)::geography,
              p_km * 1000   -- ST_DWithin uses metres for geography columns
          )
    ORDER BY w.location <-> ST_MakePoint(p_lng, p_lat)::geography;
$$;


-- ── 2. Predictive Delay Risk ────────────────────────────────
-- Compares a driver's historical avg_delivery_hours (from
-- driver_performance_view) against the remaining delivery
-- window and returns a risk_score (0.0–1.0) and a label.
--
-- Scoring logic:
--   overdue                             → 1.00 / 'overdue'
--   avg_hours  > remaining hours        → 0.80 / 'high'
--   avg_hours  > 80% of remaining hours → 0.55 / 'medium'
--   no delivery history yet             → 0.30 / 'unknown'
--   otherwise                           → 0.15 / 'low'

CREATE OR REPLACE FUNCTION predict_shipment_delay(
    p_shipment_id INT
)
RETURNS TABLE (
    shipment_id  INT,
    risk_score   NUMERIC,
    risk_label   TEXT,
    avg_hours    NUMERIC,
    hours_left   NUMERIC,
    reason       TEXT
)
LANGUAGE sql STABLE AS $$
    SELECT
        s.shipment_id,

        CASE
            WHEN s.estimated_delivery IS NULL                               THEN 0.30
            WHEN s.estimated_delivery < NOW()                               THEN 1.00
            WHEN dpv.avg_delivery_hours IS NULL                             THEN 0.30
            WHEN dpv.avg_delivery_hours > EXTRACT(EPOCH FROM
                    (s.estimated_delivery - NOW())) / 3600                  THEN 0.80
            WHEN dpv.avg_delivery_hours > 0.8 * EXTRACT(EPOCH FROM
                    (s.estimated_delivery - NOW())) / 3600                  THEN 0.55
            ELSE                                                             0.15
        END::NUMERIC                                                        AS risk_score,

        CASE
            WHEN s.estimated_delivery IS NULL                               THEN 'unknown'
            WHEN s.estimated_delivery < NOW()                               THEN 'overdue'
            WHEN dpv.avg_delivery_hours IS NULL                             THEN 'unknown'
            WHEN dpv.avg_delivery_hours > EXTRACT(EPOCH FROM
                    (s.estimated_delivery - NOW())) / 3600                  THEN 'high'
            WHEN dpv.avg_delivery_hours > 0.8 * EXTRACT(EPOCH FROM
                    (s.estimated_delivery - NOW())) / 3600                  THEN 'medium'
            ELSE                                                             'low'
        END                                                                 AS risk_label,

        ROUND(dpv.avg_delivery_hours, 2)                                    AS avg_hours,
        ROUND(
            EXTRACT(EPOCH FROM (s.estimated_delivery - NOW())) / 3600,
        2)                                                                  AS hours_left,

        CONCAT(
            'Driver avg delivery: ',
            COALESCE(ROUND(dpv.avg_delivery_hours, 1)::TEXT, 'N/A'),
            'h — Time remaining: ',
            CASE
                WHEN s.estimated_delivery IS NULL THEN 'no deadline set'
                ELSE ROUND(
                        EXTRACT(EPOCH FROM (s.estimated_delivery - NOW())) / 3600,
                     1)::TEXT || 'h'
            END
        )                                                                   AS reason

    FROM shipments s
    LEFT JOIN driver_performance_view dpv ON dpv.driver_id = s.driver_id
    WHERE s.shipment_id = p_shipment_id;
$$;


-- ── 3. Warehouse Load Forecast View ────────────────────────
-- Shows each warehouse's current occupancy AND how many
-- inbound shipments (via_warehouse, not yet arrived) are
-- heading towards it.  forecast_load_pct projects utilisation
-- once all pending shipments arrive.

CREATE OR REPLACE VIEW warehouse_load_forecast_view AS
SELECT
    w.warehouse_id,
    w.org_id,
    w.name                                              AS warehouse_name,
    w.city,
    w.capacity_units,
    w.current_load,
    ROUND(
        (w.current_load::NUMERIC / NULLIF(w.capacity_units, 0)) * 100,
    2)                                                  AS current_load_pct,
    COUNT(s.shipment_id)                                AS pending_inbound,
    ROUND(
        ((w.current_load + COUNT(s.shipment_id))::NUMERIC
            / NULLIF(w.capacity_units, 0)) * 100,
    2)                                                  AS forecast_load_pct
FROM warehouses w
LEFT JOIN shipments s
       ON s.transfer_warehouse_id = w.warehouse_id
      AND s.status NOT IN ('delivered', 'cancelled', 'at_warehouse')
GROUP BY w.warehouse_id, w.org_id, w.name, w.city,
         w.capacity_units, w.current_load;


-- ── 4. Optimal Transfer Warehouse ───────────────────────────
-- Ranks candidate transfer warehouses by TOTAL ROUTE LENGTH:
--   origin → transfer warehouse  +  transfer warehouse → destination
-- This is better than just "nearest to destination" because a warehouse
-- that is slightly farther from the destination but much closer to the
-- origin can save significant total distance.
--
-- Excludes: the origin warehouse itself, full warehouses, warehouses
-- with no GPS coordinate.

CREATE OR REPLACE FUNCTION optimal_transfer_warehouses(
    p_origin_warehouse_id INT,
    p_dest_lat            NUMERIC,
    p_dest_lng            NUMERIC,
    p_org_id              INT
)
RETURNS TABLE (
    warehouse_id        INT,
    name                TEXT,
    city                TEXT,
    address             TEXT,
    capacity_units      INT,
    current_load        INT,
    origin_to_wh_km     NUMERIC,
    wh_to_dest_km       NUMERIC,
    total_route_km      NUMERIC
)
LANGUAGE sql STABLE AS $$
    SELECT
        w.warehouse_id,
        w.name,
        w.city,
        w.address,
        w.capacity_units,
        w.current_load,
        ROUND(
            (ST_Distance(origin_wh.location, w.location) / 1000)::NUMERIC,
        2)  AS origin_to_wh_km,
        ROUND(
            (ST_Distance(
                w.location,
                ST_MakePoint(p_dest_lng, p_dest_lat)::geography
            ) / 1000)::NUMERIC,
        2)  AS wh_to_dest_km,
        ROUND(
            ((ST_Distance(origin_wh.location, w.location)
              + ST_Distance(w.location, ST_MakePoint(p_dest_lng, p_dest_lat)::geography)
             ) / 1000)::NUMERIC,
        2)  AS total_route_km
    FROM warehouses w
    -- pull origin warehouse location once via LATERAL
    CROSS JOIN (
        SELECT location
        FROM   warehouses
        WHERE  warehouse_id = p_origin_warehouse_id
    ) origin_wh
    WHERE w.org_id              = p_org_id
      AND w.warehouse_id       != p_origin_warehouse_id
      AND w.location            IS NOT NULL
      AND origin_wh.location    IS NOT NULL
      AND w.current_load        <  w.capacity_units
    ORDER BY total_route_km ASC;
$$;
