-- FORCE RLS + dedicated app user 

CREATE USER fleetiq_app WITH PASSWORD 'fleetiq_app_password';
GRANT CONNECT ON DATABASE fleetiq TO fleetiq_app;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO fleetiq_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fleetiq_app;
GRANT EXECUTE ON ALL FUNCTIONS   IN SCHEMA public TO fleetiq_app;
GRANT EXECUTE ON ALL PROCEDURES  IN SCHEMA public TO fleetiq_app;
GRANT fleet_admin   TO fleetiq_app;
GRANT fleet_manager TO fleetiq_app;
GRANT fleet_driver  TO fleetiq_app;

ALTER TABLE shipments               FORCE ROW LEVEL SECURITY;
ALTER TABLE shipment_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications           FORCE ROW LEVEL SECURITY;