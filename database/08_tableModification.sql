ALTER TABLE shipments
ADD CONSTRAINT chk_transfer_wh_when_direct
CHECK (
    (delivery_mode = 'direct' AND transfer_warehouse_id IS NULL)
 OR (delivery_mode = 'via_warehouse' AND transfer_warehouse_id IS NOT NULL)
);


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
WHERE status IN ('assigned','in_progress');