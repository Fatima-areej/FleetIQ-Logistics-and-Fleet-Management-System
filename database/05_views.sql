----------------------------------------------------
-------------- Views -------------------------------


--			View 1 
--			All shipments that are currently active.


CREATE VIEW active_shipments_view AS
SELECT
    s.shipment_id,
    s.org_id,
    s.status,
    s.priority,
    s.destination_address,
    s.weight_kg,
    s.created_at,
    s.estimated_delivery,
    s.delivery_mode,
    s.transfer_warehouse_id,
    u.name          AS driver_name,
    u.user_id       AS driver_user_id,
    d.driver_id,
    d.rating        AS driver_rating,
    v.plate_number  AS vehicle_plate,
    v.vehicle_type,
    w.name          AS origin_warehouse,
    w.city          AS origin_city,
    w.warehouse_id  AS origin_warehouse_id,
    tw.name         AS transfer_warehouse,
    tw.city         AS transfer_city
FROM shipments s
LEFT JOIN drivers    d  ON d.driver_id     = s.driver_id
LEFT JOIN users      u  ON u.user_id       = d.user_id
LEFT JOIN vehicles   v  ON v.vehicle_id    = s.vehicle_id
LEFT JOIN warehouses w  ON w.warehouse_id  = s.origin_warehouse_id
LEFT JOIN warehouses tw ON tw.warehouse_id = s.transfer_warehouse_id
WHERE s.status NOT IN ('delivered', 'cancelled');


--			View 2
--			View of driver performance stats



CREATE OR REPLACE VIEW driver_performance_view AS
SELECT
    d.driver_id,
    u.name                                              AS driver_name,
    u.org_id,
    d.rating,
    d.total_deliveries,
    d.availability_status,
    COUNT(s.shipment_id)
        FILTER (WHERE s.status = 'delivered')           AS completed_deliveries,
    COUNT(s.shipment_id)
        FILTER (WHERE s.status = 'delivered'
                  AND s.delivered_at <= s.estimated_delivery) AS on_time_deliveries,
    COUNT(s.shipment_id)
        FILTER (WHERE s.status = 'delivered'
                  AND s.delivered_at > s.estimated_delivery)  AS delayed_deliveries,
    COUNT(s.shipment_id)
        FILTER (WHERE s.status = 'cancelled')           AS cancelled_deliveries,
    ROUND(
        AVG(
            EXTRACT(EPOCH FROM (s.delivered_at - s.created_at)) / 3600
        ) FILTER (WHERE s.status = 'delivered'),
    2)                                                  AS avg_delivery_hours
FROM drivers d
JOIN users    u ON u.user_id   = d.user_id
LEFT JOIN shipments s ON s.driver_id = d.driver_id
GROUP BY d.driver_id, u.name, u.org_id, d.rating,
         d.total_deliveries, d.availability_status;



--			View 3 
--			Measures how effectively the fleet (vehicles) are being used 


CREATE OR REPLACE VIEW fleet_utilization_view AS
SELECT
    v.vehicle_id,
    v.org_id,
    v.plate_number,
    v.vehicle_type,
    v.capacity_kg,
    v.status                              AS current_status,
    COALESCE(s_agg.total_trips,        0) AS total_trips,
    COALESCE(vm_agg.total_cost,        0) AS total_maintenance_cost,
    COALESCE(mr_agg.maintenance_count, 0) AS maintenance_count,
    mr_agg.last_maintenance_date
FROM vehicles v
LEFT JOIN (
    SELECT vehicle_id, COUNT(DISTINCT shipment_id) AS total_trips
    FROM shipments WHERE status = 'delivered'
    GROUP BY vehicle_id
) s_agg  ON s_agg.vehicle_id  = v.vehicle_id
LEFT JOIN (
    SELECT vehicle_id, SUM(cost) AS total_cost
    FROM vehicle_maintenance
    GROUP BY vehicle_id
) vm_agg ON vm_agg.vehicle_id = v.vehicle_id
LEFT JOIN (
    SELECT vehicle_id,
           COUNT(*)        AS maintenance_count,
           MAX(created_at) AS last_maintenance_date
    FROM maintenance_requests
    GROUP BY vehicle_id
) mr_agg ON mr_agg.vehicle_id = v.vehicle_id;


--			View 4
--			Measures warehouse performance and congestion


CREATE OR REPLACE VIEW warehouse_throughput_view AS
SELECT
    w.warehouse_id,
    w.org_id,
    w.name                                              AS warehouse_name,
    w.city,
    w.capacity_units,
    w.current_load,
    ROUND(
        (w.current_load::NUMERIC / NULLIF(w.capacity_units, 0)) * 100,
    2)                                                  AS load_percentage,
    COUNT(DISTINCT ws.shipment_id)                      AS total_shipments_handled,
    ROUND(
        AVG(
            EXTRACT(EPOCH FROM (ws.departure_time - ws.arrival_time)) / 3600
        ) FILTER (WHERE ws.departure_time IS NOT NULL),
    2)                                                  AS avg_dwell_hours
FROM warehouses w
LEFT JOIN warehouse_shipments ws ON ws.warehouse_id = w.warehouse_id
GROUP BY w.warehouse_id, w.org_id, w.name, w.city,
         w.capacity_units, w.current_load;


--			View 5 
--			Shows all shipments that missed the deadline

CREATE OR REPLACE VIEW delayed_shipments_view AS
SELECT
    s.shipment_id,
    s.org_id,
    s.status,
    s.priority,
    s.destination_address,
    s.estimated_delivery,
    s.created_at,
    ROUND(
        EXTRACT(EPOCH FROM (NOW() - s.estimated_delivery)) / 3600,
    2)                                                  AS hours_overdue,
    u.name                                              AS driver_name,
    d.driver_id,
    w.name                                              AS origin_warehouse,
    w.warehouse_id                                      AS origin_warehouse_id
FROM shipments s
LEFT JOIN drivers    d ON d.driver_id    = s.driver_id
LEFT JOIN users      u ON u.user_id      = d.user_id
LEFT JOIN warehouses w ON w.warehouse_id = s.origin_warehouse_id
WHERE s.estimated_delivery < NOW()
  AND s.status NOT IN ('delivered', 'cancelled')
ORDER BY s.estimated_delivery ASC;


--			View 6
--			Shows which managers supervise which drivers based on 
--			active shipments and warehouse assignment.


CREATE OR REPLACE VIEW driver_managers_view AS
SELECT DISTINCT
    d.driver_id,
    d.user_id     AS driver_user_id,
    u_mgr.user_id AS manager_user_id,
    u_mgr.name    AS manager_name
FROM drivers d
JOIN shipments s ON s.driver_id = d.driver_id
JOIN warehouses w ON w.warehouse_id = s.origin_warehouse_id
JOIN manager_warehouse_assignments mwa
    ON mwa.warehouse_id = w.warehouse_id AND mwa.is_active = TRUE
JOIN users u_mgr ON u_mgr.user_id = mwa.manager_id;

