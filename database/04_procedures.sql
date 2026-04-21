---------------------------------------------------------------
----------------------Stored Procedures -----------------------


--			Procedure 1
--			To assign a shipment to a driver & vehicle, updating all relevant records
--			checks availability first


CREATE OR REPLACE PROCEDURE assign_shipment(
    p_shipment_id INT,
    p_driver_id   INT,
    p_vehicle_id  INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_driver_status  driver_status_enum;
    v_vehicle_status vehicle_status_enum;
    v_org_shipment   INT;
    v_org_vehicle    INT;
BEGIN
    -- check driver availability
    SELECT availability_status INTO v_driver_status
    FROM drivers WHERE driver_id = p_driver_id;

    IF v_driver_status != 'available' THEN
        RAISE EXCEPTION 'Driver % is not available. Current status: %',
            p_driver_id, v_driver_status;
    END IF;

    -- check vehicle availability
    SELECT status INTO v_vehicle_status
    FROM vehicles WHERE vehicle_id = p_vehicle_id;

    IF v_vehicle_status != 'available' THEN
        RAISE EXCEPTION 'Vehicle % is not available. Current status: %',
            p_vehicle_id, v_vehicle_status;
    END IF;

    -- check vehicle belongs to same org as shipment
    SELECT org_id INTO v_org_shipment FROM shipments WHERE shipment_id = p_shipment_id;
    SELECT org_id INTO v_org_vehicle  FROM vehicles  WHERE vehicle_id  = p_vehicle_id;

    IF v_org_shipment != v_org_vehicle THEN
        RAISE EXCEPTION 'Vehicle does not belong to the same organization as the shipment.';
    END IF;

    -- assign driver and vehicle to shipment
    UPDATE shipments
    SET driver_id  = p_driver_id,
        vehicle_id = p_vehicle_id,
        status     = 'assigned'
    WHERE shipment_id = p_shipment_id;

    -- mark driver as on_delivery
    UPDATE drivers
    SET availability_status = 'on_delivery'
    WHERE driver_id = p_driver_id;

    -- mark vehicle as in_use
    UPDATE vehicles
    SET status = 'in_use'
    WHERE vehicle_id = p_vehicle_id;

    -- create assignment record
    INSERT INTO driver_vehicle_assignments (
        driver_id, vehicle_id, assigned_at, is_active
    ) VALUES (
        p_driver_id, p_vehicle_id, NOW(), TRUE
    );

    RAISE NOTICE 'Shipment % successfully assigned to driver % and vehicle %.',
        p_shipment_id, p_driver_id, p_vehicle_id;
END;
$$;


--			Procedure 2
--			Finish a delivery, update status and relevant records 

CREATE OR REPLACE PROCEDURE complete_delivery(
    p_shipment_id INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_driver_id  INT;
    v_vehicle_id INT;
    v_est        TIMESTAMP;
    v_now        TIMESTAMP := NOW();
BEGIN
    -- get shipment details
    SELECT driver_id, vehicle_id, estimated_delivery
    INTO v_driver_id, v_vehicle_id, v_est
    FROM shipments
    WHERE shipment_id = p_shipment_id;

    IF v_driver_id IS NULL THEN
        RAISE EXCEPTION 'Shipment % has no assigned driver.', p_shipment_id;
    END IF;

    -- mark shipment as delivered
    UPDATE shipments
    SET status       = 'delivered',
        delivered_at = v_now
    WHERE shipment_id = p_shipment_id;

    -- increment driver total deliveries
    UPDATE drivers
    SET total_deliveries = total_deliveries + 1
    WHERE driver_id = v_driver_id;

    -- recalculate driver rating
    CALL calculate_driver_rating(v_driver_id);

    -- trg_sync_on_delivery_complete trigger fires automatically here
    -- it frees the vehicle and driver status

    RAISE NOTICE 'Shipment % marked as delivered at %.', p_shipment_id, v_now;
END;
$$;


--			Procedure 3 
--			Calculate driver performance score 

CREATE OR REPLACE PROCEDURE calculate_driver_rating(
    p_driver_id INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_total      INT;
    v_on_time    INT;
    v_delayed    INT;
    v_cancelled  INT;
    v_new_rating NUMERIC(3,2);
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE status = 'delivered'),
        COUNT(*) FILTER (WHERE status = 'delivered'
                           AND delivered_at <= estimated_delivery),
        COUNT(*) FILTER (WHERE status = 'delivered'
                           AND delivered_at > estimated_delivery),
        COUNT(*) FILTER (WHERE status = 'cancelled')
    INTO v_total, v_on_time, v_delayed, v_cancelled
    FROM shipments
    WHERE driver_id = p_driver_id;

    IF v_total = 0 THEN
        v_new_rating := 5.00;
    ELSE
        -- on-time = full score, delayed = partial, cancelled = penalty
        v_new_rating := ROUND(
            ((v_on_time * 5.0) + (v_delayed * 2.5) + (v_cancelled * 0.0))
            / NULLIF(v_total, 0),
        2);
    END IF;

    -- clamp between 0 and 5
    v_new_rating := GREATEST(0.00, LEAST(5.00, v_new_rating));

    UPDATE drivers
    SET rating = v_new_rating
    WHERE driver_id = p_driver_id;

    RAISE NOTICE 'Driver % rating updated to %.', p_driver_id, v_new_rating;
END;
$$;

--			procedure 4
--			Move shipment into warehouse, prevents overloading warehouse


CREATE OR REPLACE PROCEDURE transfer_to_warehouse(
    p_shipment_id  INT,
    p_warehouse_id INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_capacity INT;
    v_load     INT;
BEGIN
    -- check warehouse capacity
    SELECT capacity_units, current_load
    INTO v_capacity, v_load
    FROM warehouses
    WHERE warehouse_id = p_warehouse_id;

    IF v_load >= v_capacity THEN
        RAISE EXCEPTION 'Warehouse % is at full capacity (% / %).',
            p_warehouse_id, v_load, v_capacity;
    END IF;

    -- record arrival
    INSERT INTO warehouse_shipments (
        shipment_id,
        warehouse_id,
        arrival_time
    ) VALUES (
        p_shipment_id,
        p_warehouse_id,
        NOW()
    );

    -- update shipment status
    UPDATE shipments
    SET status = 'at_warehouse'
    WHERE shipment_id = p_shipment_id;

    -- trg_sync_warehouse_load trigger fires automatically
    -- and increments current_load

    RAISE NOTICE 'Shipment % transferred to warehouse %.', p_shipment_id, p_warehouse_id;
END;
$$;


--			Procedure 5
--			Find closest warehouse to given location


CREATE OR REPLACE PROCEDURE get_nearest_warehouse(
    p_lat  NUMERIC,
    p_lng  NUMERIC,
    p_org_id INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_name     TEXT;
    v_city     TEXT;
    v_distance NUMERIC;
BEGIN
    SELECT
        name,
        city,
        ROUND(
            (ST_Distance(
                location,
                ST_MakePoint(p_lng, p_lat)::geography
            ) / 1000)::NUMERIC,
        2)
    INTO v_name, v_city, v_distance
    FROM warehouses
    WHERE org_id = p_org_id
      AND location IS NOT NULL
    ORDER BY location <-> ST_MakePoint(p_lng, p_lat)::geography
    LIMIT 1;

    RAISE NOTICE 'Nearest warehouse: % in % — % km away.', v_name, v_city, v_distance;
END;
$$;

