-- Adds delivery routing fields to shipments for manager/driver workflow.
-- Run this once after the base schema is created.

CREATE TYPE delivery_mode_enum AS ENUM ('direct', 'via_warehouse');

ALTER TABLE shipments
ADD COLUMN delivery_mode delivery_mode_enum NOT NULL DEFAULT 'direct';

ALTER TABLE shipments
ADD COLUMN transfer_warehouse_id INT REFERENCES warehouses(warehouse_id);

-- If direct, there should be no transfer warehouse.
ALTER TABLE shipments
ADD CONSTRAINT chk_transfer_wh_when_direct
CHECK (
    (delivery_mode = 'direct' AND transfer_warehouse_id IS NULL)
 OR (delivery_mode = 'via_warehouse' AND transfer_warehouse_id IS NOT NULL)
);



-- Enforce: a driver can have only ONE active shipment at a time
-- Active = status NOT IN ('delivered','cancelled')

CREATE OR REPLACE FUNCTION fn_enforce_one_active_shipment_per_driver()
RETURNS TRIGGER AS $$
BEGIN
    -- Only enforce when shipment is active and has a driver
    IF NEW.driver_id IS NOT NULL
       AND NEW.status NOT IN ('delivered','cancelled') THEN

        IF EXISTS (
            SELECT 1
            FROM shipments s
            WHERE s.driver_id = NEW.driver_id
              AND s.status NOT IN ('delivered','cancelled')
              AND s.shipment_id <> COALESCE(NEW.shipment_id, -1)
        ) THEN
            RAISE EXCEPTION
                'Driver % already has an active shipment.',
                NEW.driver_id
            USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_one_active_shipment_per_driver ON shipments;

CREATE TRIGGER trg_one_active_shipment_per_driver
BEFORE INSERT OR UPDATE OF driver_id, status ON shipments
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_one_active_shipment_per_driver();

