------------------------------------------------------
--------------------Triggers--------------------------



-- 			Trigger 1
-- 			To create a history / audit trail every time shipment status changes.

CREATE OR REPLACE FUNCTION fn_log_shipment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO shipment_status_history (
            shipment_id,
            status,
            notes,
            changed_at
        ) VALUES (
            NEW.shipment_id,
            NEW.status,
            'Status changed from ' || OLD.status || ' to ' || NEW.status,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_shipment_status
AFTER UPDATE OF status ON shipments
FOR EACH ROW
EXECUTE FUNCTION fn_log_shipment_status();

-- 			Trigger 2
-- 			To notify driver whenever shipment is assigned 

CREATE OR REPLACE FUNCTION fn_notify_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_driver_user_id INT;
    v_shipment_id    INT;
    v_new_status     TEXT;
    v_message        TEXT;
    v_title          TEXT;
BEGIN
    v_shipment_id := NEW.shipment_id;
    v_new_status  := NEW.status;

    -- only fire for statuses the driver did NOT set themselves
    IF v_new_status NOT IN ('assigned', 'cancelled') THEN
        RETURN NEW;
    END IF;

    -- get the driver's user_id
    SELECT u.user_id INTO v_driver_user_id
    FROM shipments s
    JOIN drivers d ON d.driver_id = s.driver_id
    JOIN users u   ON u.user_id   = d.user_id
    WHERE s.shipment_id = v_shipment_id;

    IF v_driver_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- build a meaningful message per status
    IF v_new_status = 'assigned' THEN
        v_title   := 'New delivery assigned';
        v_message := 'Shipment #' || v_shipment_id 
                     || ' has been assigned to you. Please check your deliveries.';
    ELSIF v_new_status = 'cancelled' THEN
        v_title   := 'Delivery cancelled';
        v_message := 'Shipment #' || v_shipment_id 
                     || ' has been cancelled by management.';
    END IF;

    INSERT INTO notifications (
        user_id, title, message, event_type, is_read, created_at
    ) VALUES (
        v_driver_user_id, v_title, v_message,
        'status_change', FALSE, NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_on_status_change
AFTER INSERT ON shipment_status_history
FOR EACH ROW
EXECUTE FUNCTION fn_notify_on_status_change();

-- 			Trigger 3
--			Whenever shipment finishes (delivered or cancelled), automatically
--			free the driver and vehicle.

CREATE OR REPLACE FUNCTION fn_sync_on_delivery_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('delivered', 'cancelled') THEN

        -- free the vehicle
        UPDATE vehicles
        SET status = 'available'
        WHERE vehicle_id = NEW.vehicle_id;

        -- free the driver
        UPDATE drivers
        SET availability_status = 'available'
        WHERE driver_id = NEW.driver_id;

        -- deactivate the driver-vehicle assignment
        UPDATE driver_vehicle_assignments
        SET is_active = FALSE,
            end_date  = CURRENT_DATE
        WHERE driver_id  = NEW.driver_id
          AND vehicle_id = NEW.vehicle_id
          AND is_active  = TRUE;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_on_delivery_complete
AFTER UPDATE OF status ON shipments
FOR EACH ROW
EXECUTE FUNCTION fn_sync_on_delivery_complete();

--			Trigger 4 
--			Tracks warehouse load, updates load whenever a shipment arrives or 
--			departs to or from the warehouse.

CREATE OR REPLACE FUNCTION fn_sync_warehouse_load()
RETURNS TRIGGER AS $$
BEGIN
    -- shipment arriving (new row inserted with arrival_time set)
    IF TG_OP = 'INSERT' AND NEW.arrival_time IS NOT NULL THEN
        UPDATE warehouses
        SET current_load = current_load + 1
        WHERE warehouse_id = NEW.warehouse_id;
    END IF;

    -- shipment departing (departure_time being set for first time)
    IF TG_OP = 'UPDATE'
       AND NEW.departure_time IS NOT NULL
       AND OLD.departure_time IS NULL THEN
        UPDATE warehouses
        SET current_load = GREATEST(current_load - 1, 0)
        WHERE warehouse_id = NEW.warehouse_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;		

CREATE TRIGGER trg_sync_warehouse_load
AFTER INSERT OR UPDATE ON warehouse_shipments
FOR EACH ROW
EXECUTE FUNCTION fn_sync_warehouse_load();

--			Trigger 5
--			Notify user whenever a new memo is sent

CREATE OR REPLACE FUNCTION fn_notify_on_memo()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_name TEXT;
BEGIN
    -- get sender name for a meaningful message
    SELECT name INTO v_sender_name
    FROM users WHERE user_id = NEW.sender_id;

    INSERT INTO notifications (
        user_id, title, message, event_type, is_read, created_at
    ) VALUES (
        NEW.receiver_id,
        'New memo from ' || v_sender_name,
        'Subject: ' || NEW.subject,
        'memo',
        FALSE,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_on_memo
AFTER INSERT ON memos
FOR EACH ROW
EXECUTE FUNCTION fn_notify_on_memo();

