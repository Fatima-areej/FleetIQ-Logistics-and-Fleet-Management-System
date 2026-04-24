
CREATE TYPE maintenance_source_enum AS ENUM ('driver','admin');
CREATE TYPE maintenance_request_status_enum AS ENUM ('open','assigned','in_progress','resolved','cancelled');
CREATE TYPE maintenance_priority_enum AS ENUM ('low','normal','high','urgent');

CREATE TABLE maintenance_requests (
  request_id          SERIAL PRIMARY KEY,

  org_id              INT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  vehicle_id          INT NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,

  -- who created the request
  requested_by        INT NOT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  source              maintenance_source_enum NOT NULL,

  -- context (optional but very useful)
  shipment_id         INT REFERENCES shipments(shipment_id) ON DELETE SET NULL,
  warehouse_id        INT REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,

  -- assignment
  assigned_manager_id INT REFERENCES users(user_id) ON DELETE SET NULL,

  status              maintenance_request_status_enum NOT NULL DEFAULT 'open',
  priority            maintenance_priority_enum NOT NULL DEFAULT 'normal',

  title               TEXT,
  description         TEXT,

  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMP
);

CREATE INDEX idx_mr_org        ON maintenance_requests(org_id);
CREATE INDEX idx_mr_vehicle    ON maintenance_requests(vehicle_id);
CREATE INDEX idx_mr_status     ON maintenance_requests(status);
CREATE INDEX idx_mr_manager    ON maintenance_requests(assigned_manager_id);
CREATE INDEX idx_mr_created_at ON maintenance_requests(created_at);

ALTER TABLE maintenance_requests
ADD CONSTRAINT chk_request_must_be_assigned
CHECK (assigned_manager_id IS NOT NULL);


ALTER TABLE maintenance_requests
ADD CONSTRAINT chk_resolved_time
CHECK (
  (status = 'resolved' AND resolved_at IS NOT NULL)
  OR
  (status <> 'resolved' AND resolved_at IS NULL)
);


CREATE UNIQUE INDEX uq_active_request_per_vehicle
ON maintenance_requests(vehicle_id)
WHERE status IN ('open','assigned','in_progress');

--some changes to remove 'open' 

-- 0) Drop objects that reference the old enum values
DROP INDEX IF EXISTS uq_active_request_per_vehicle;

ALTER TABLE maintenance_requests
  DROP CONSTRAINT IF EXISTS chk_resolved_time;

-- 1) Safety: if any rows are 'open', decide what they become (usually 'assigned')
UPDATE maintenance_requests
SET status = 'assigned'
WHERE status = 'open';

-- 2) Create a new enum without 'open'
CREATE TYPE maintenance_request_status_enum_new AS ENUM (
  'assigned',
  'in_progress',
  'resolved',
  'cancelled'
);

-- 3) Swap the column to the new enum type
ALTER TABLE maintenance_requests
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE maintenance_requests
  ALTER COLUMN status TYPE maintenance_request_status_enum_new
  USING status::text::maintenance_request_status_enum_new;

ALTER TABLE maintenance_requests
  ALTER COLUMN status SET DEFAULT 'assigned';

-- 4) Replace old type name
DROP TYPE maintenance_request_status_enum;
ALTER TYPE maintenance_request_status_enum_new RENAME TO maintenance_request_status_enum;

-- 5) Recreate constraint + index using the (new) enum
ALTER TABLE maintenance_requests
ADD CONSTRAINT chk_resolved_time
CHECK (
  (status = 'resolved' AND resolved_at IS NOT NULL)
  OR
  (status <> 'resolved' AND resolved_at IS NULL)
);

CREATE UNIQUE INDEX uq_active_request_per_vehicle
ON maintenance_requests(vehicle_id)
WHERE status IN ('assigned','in_progress');



/*
When driver requests maintenance, vehicle becomes maintenance,  even though replacement-vehicle is set to vehicle id of that shipment assigned to driver but 
The cases where it can still be the old ID are basically :
Manager never assigned a replacement (request exists, but shipment eventually gets cancelled/delivered by admin/manager anyway).
Replacement call failed/rolled back (validation failed, no available replacement, driver/shipment constraints not met) so shipment stayed on old vehicle.

so when the shipment is later marked delivered/cancelled,  a DB trigger flips the vehicle back to available anyway even though it's on maintenance
Fix: update the trigger to not set vehicle available if it’s currently maintenance.
*/

CREATE OR REPLACE FUNCTION fn_sync_on_delivery_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('delivered', 'cancelled') THEN

    -- free the vehicle ONLY if it isn't in maintenance
    UPDATE vehicles
    SET status = 'available'
    WHERE vehicle_id = NEW.vehicle_id
      AND status <> 'maintenance';    --newly added 

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