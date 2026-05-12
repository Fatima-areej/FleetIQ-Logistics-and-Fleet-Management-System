-----------------------------------------------------
----------------- B-tree indexes --------------------



CREATE INDEX idx_users_org          ON users(org_id);
CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_drivers_user       ON drivers(user_id);
CREATE INDEX idx_drivers_status     ON drivers(availability_status);
CREATE INDEX idx_vehicles_org       ON vehicles(org_id);
CREATE INDEX idx_vehicles_status    ON vehicles(status);
CREATE INDEX idx_shipments_org      ON shipments(org_id);
CREATE INDEX idx_shipments_status   ON shipments(status);
CREATE INDEX idx_shipments_driver   ON shipments(driver_id);
CREATE INDEX idx_shipments_vehicle  ON shipments(vehicle_id);
CREATE INDEX idx_shipments_origin   ON shipments(origin_warehouse_id);
CREATE INDEX idx_shipments_priority ON shipments(priority);
CREATE INDEX idx_shipments_est_del  ON shipments(estimated_delivery);
CREATE INDEX idx_status_hist_ship   ON shipment_status_history(shipment_id);
CREATE INDEX idx_wh_ship_shipment   ON warehouse_shipments(shipment_id);
CREATE INDEX idx_wh_ship_warehouse  ON warehouse_shipments(warehouse_id);
CREATE INDEX idx_maintenance_veh    ON vehicle_maintenance(vehicle_id);
CREATE INDEX idx_notif_user         ON notifications(user_id, is_read);
CREATE INDEX idx_mwa_manager        ON manager_warehouse_assignments(manager_id);
CREATE INDEX idx_mwa_warehouse      ON manager_warehouse_assignments(warehouse_id);
CREATE INDEX idx_memos_receiver 	ON memos(receiver_id);
CREATE INDEX idx_memos_sender   	ON memos(sender_id);
CREATE INDEX idx_memos_org      	ON memos(org_id);
CREATE INDEX idx_mr_org        		ON maintenance_requests(org_id);
CREATE INDEX idx_mr_vehicle    		ON maintenance_requests(vehicle_id);
CREATE INDEX idx_mr_status     		ON maintenance_requests(status);
CREATE INDEX idx_mr_manager    		ON maintenance_requests(assigned_manager_id);
CREATE INDEX idx_mr_created_at 		ON maintenance_requests(created_at);

-- GIST indexes (geo-spatial)
CREATE INDEX idx_warehouse_location   ON warehouses USING GIST(location);
CREATE INDEX idx_vehicle_location     ON vehicles   USING GIST(current_location);
CREATE INDEX idx_shipment_destination ON shipments  USING GIST(destination_location);

