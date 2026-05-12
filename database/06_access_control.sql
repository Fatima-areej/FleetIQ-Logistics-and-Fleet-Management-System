------------------------------------------------------
------------------Access Control----------------------


-- 		3 Roles:

CREATE ROLE fleet_admin;
CREATE ROLE fleet_manager;
CREATE ROLE fleet_driver;


--	Permissions (what actions each role can do:)

-- 1. Fleet Admin

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fleet_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fleet_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO fleet_admin;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO fleet_admin;

-- read access on everything
GRANT SELECT ON ALL TABLES IN SCHEMA public TO fleet_manager;


-- 2. Fleet Manager
-- Can run operations but cannot: delete users, edit organizations, drop data

-- write access on operational tables only
GRANT INSERT, UPDATE ON shipments                    TO fleet_manager;
GRANT INSERT, UPDATE ON warehouse_shipments          TO fleet_manager;
GRANT INSERT, UPDATE ON driver_vehicle_assignments   TO fleet_manager;
GRANT INSERT, UPDATE ON shipment_items               TO fleet_manager;
GRANT INSERT        ON notifications                 TO fleet_manager;
GRANT UPDATE        ON drivers                       TO fleet_manager;
GRANT UPDATE        ON vehicles                      TO fleet_manager;

-- access to sequences for inserts
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO fleet_manager;

-- can call procedures
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO fleet_manager;


-- 3. Drivers

-- read access on need-to-know tables only
GRANT SELECT ON shipments                 TO fleet_driver;
GRANT SELECT ON shipment_items            TO fleet_driver;
GRANT SELECT ON shipment_status_history   TO fleet_driver;
GRANT SELECT ON notifications             TO fleet_driver;
GRANT SELECT ON warehouses                TO fleet_driver;
GRANT SELECT ON vehicles                  TO fleet_driver;

-- can update shipment status only
GRANT UPDATE (status, delivered_at) ON shipments TO fleet_driver;

-- can mark notifications as read
GRANT UPDATE (is_read) ON notifications TO fleet_driver;


-- ROW LEVEL SECURITY:

-- enable RLS on the tables drivers interact with

ALTER TABLE shipments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;

-- admin sees all shipments in their org

CREATE POLICY admin_shipments_policy ON shipments
FOR ALL
TO fleet_admin
USING (TRUE);

-- manager sees all shipments where origin warehouse is one they manage

CREATE POLICY manager_shipments_policy ON shipments
FOR ALL
TO fleet_manager
USING (
    origin_warehouse_id IN (
        SELECT warehouse_id
        FROM manager_warehouse_assignments
        WHERE manager_id = current_setting('app.current_user_id')::INT
          AND is_active = TRUE
    )
);

-- driver sees only their own shipments

CREATE POLICY driver_shipments_policy ON shipments
FOR ALL
TO fleet_driver
USING (
    driver_id = (
        SELECT driver_id FROM drivers
        WHERE user_id = current_setting('app.current_user_id')::INT
    )
);


-- everyone only sees their own notifications


CREATE POLICY admin_notifications_policy ON notifications
FOR ALL TO fleet_admin
USING (TRUE);

CREATE POLICY manager_notifications_policy ON notifications
FOR ALL TO fleet_manager
USING (user_id = current_setting('app.current_user_id')::INT);

CREATE POLICY driver_notifications_policy ON notifications
FOR ALL TO fleet_driver
USING (user_id = current_setting('app.current_user_id')::INT);


-- admin sees all history

CREATE POLICY admin_history_policy ON shipment_status_history
FOR ALL TO fleet_admin
USING (TRUE);


-- manager sees history for shipments in their warehouses

CREATE POLICY manager_history_policy ON shipment_status_history
FOR ALL TO fleet_manager
USING (
    shipment_id IN (
        SELECT shipment_id FROM shipments
        WHERE origin_warehouse_id IN (
            SELECT warehouse_id
            FROM manager_warehouse_assignments
            WHERE manager_id = current_setting('app.current_user_id')::INT
              AND is_active = TRUE
        )
    )
);


-- driver sees history only for their own shipments

CREATE POLICY driver_history_policy ON shipment_status_history
FOR ALL TO fleet_driver
USING (
    shipment_id IN (
        SELECT shipment_id FROM shipments
        WHERE driver_id = (
            SELECT driver_id FROM drivers
            WHERE user_id = current_setting('app.current_user_id')::INT
        )
    )
);
