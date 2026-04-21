--create extension postgis;
--create extension postgis_topology;
--select PostGIS_Version();

/*

--------------------------------------------------
------------------ Enums -------------------------


CREATE TYPE role_enum AS ENUM
('admin','manager','driver');

CREATE TYPE shipment_status_enum AS ENUM
('created','assigned','in_transit','at_warehouse','out_for_delivery','delivered','cancelled');

CREATE TYPE priority_enum AS ENUM
('low','normal','high','urgent');

CREATE TYPE vehicle_status_enum AS ENUM
('available','in_use','maintenance');

CREATE TYPE driver_status_enum AS ENUM
('available','on_delivery','off_duty');

CREATE TYPE maintenance_type_enum AS ENUM
('routine','repair','inspection','emergency');


---------------------------------------------------
------------------ Schema -------------------------



-- 1. organizations

CREATE TABLE organizations (
    org_id       SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    industry     TEXT,
    contact_email TEXT,
    phone        TEXT,
    created_at   TIMESTAMP DEFAULT NOW()
);

-- 2. users

CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    org_id        INT NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          role_enum NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    last_login    TIMESTAMP,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- 3. drivers

CREATE TABLE drivers (
    driver_id           SERIAL PRIMARY KEY,
    user_id             INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    license_number      TEXT NOT NULL,
    experience_years    INT DEFAULT 0,
    availability_status driver_status_enum DEFAULT 'available',
    rating              NUMERIC(3,2) DEFAULT 5.00,
    total_deliveries    INT DEFAULT 0
);

-- 4. vehicles

CREATE TABLE vehicles (
    vehicle_id       SERIAL PRIMARY KEY,
    org_id           INT REFERENCES organizations(org_id) ON DELETE CASCADE,
    plate_number     TEXT UNIQUE,
    vehicle_type     TEXT,
    capacity_kg      INT,
    purchase_date    DATE,
    status           vehicle_status_enum DEFAULT 'available',
    current_location geography(Point, 4326)
);

-- 5. driver_vehicle_assignments

CREATE TABLE driver_vehicle_assignments (
    assignment_id SERIAL PRIMARY KEY,
    driver_id     INT REFERENCES drivers(driver_id),
    vehicle_id    INT REFERENCES vehicles(vehicle_id),
    assigned_at   TIMESTAMP DEFAULT NOW(),
    end_date      DATE,
    is_active     BOOLEAN DEFAULT TRUE
);

-- 6. warehouses

CREATE TABLE warehouses (
    warehouse_id   SERIAL PRIMARY KEY,
    org_id         INT REFERENCES organizations(org_id),
    name           TEXT,
    city           TEXT,
    address        TEXT,
    location       geography(Point, 4326),
    capacity_units INT,
    current_load   INT DEFAULT 0
);

-- 7. manager_warehouse_assignments

CREATE TABLE manager_warehouse_assignments (
    assignment_id  SERIAL PRIMARY KEY,
    manager_id     INT REFERENCES users(user_id),
    warehouse_id   INT REFERENCES warehouses(warehouse_id),
    assigned_date  DATE DEFAULT CURRENT_DATE,
    is_active      BOOLEAN DEFAULT TRUE
);

-- 8. shipments

CREATE TABLE shipments (
    shipment_id          SERIAL PRIMARY KEY,
    org_id               INT REFERENCES organizations(org_id),
    driver_id            INT REFERENCES drivers(driver_id),
    vehicle_id           INT REFERENCES vehicles(vehicle_id),
    origin_warehouse_id  INT REFERENCES warehouses(warehouse_id),
    destination_address  TEXT,
    destination_location geography(Point, 4326),
    weight_kg            NUMERIC(10,2),
    status               shipment_status_enum DEFAULT 'created',
    priority             priority_enum DEFAULT 'normal',
    created_at           TIMESTAMP DEFAULT NOW(),
    estimated_delivery   TIMESTAMP,
    delivered_at         TIMESTAMP
);

-- 9. shipment_items

CREATE TABLE shipment_items (
    item_id     SERIAL PRIMARY KEY,
    shipment_id INT REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    item_name   TEXT,
    quantity    INT,
    weight      NUMERIC(10,2),
    category    TEXT
);

-- 10. shipment_status_history

CREATE TABLE shipment_status_history (
    history_id  SERIAL PRIMARY KEY,
    shipment_id INT REFERENCES shipments(shipment_id),
    status      shipment_status_enum,
    notes       TEXT,
    updated_by  INT REFERENCES users(user_id),
    changed_at  TIMESTAMP DEFAULT NOW()
);

-- 11. warehouse_shipments

CREATE TABLE warehouse_shipments (
    id             SERIAL PRIMARY KEY,
    shipment_id    INT REFERENCES shipments(shipment_id),
    warehouse_id   INT REFERENCES warehouses(warehouse_id),
    arrival_time   TIMESTAMP,
    departure_time TIMESTAMP,
    handler_notes  TEXT
);

-- 12. vehicle_maintenance

CREATE TABLE vehicle_maintenance (
    maintenance_id   SERIAL PRIMARY KEY,
    vehicle_id       INT REFERENCES vehicles(vehicle_id),
    maintenance_type maintenance_type_enum,
    description      TEXT,
    cost             NUMERIC(10,2),
    performed_by     TEXT,
    performed_at     TIMESTAMP DEFAULT NOW()
);

-- 13. notifications

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(user_id),
    title           TEXT,
    message         TEXT,
    event_type      TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 14. memos

CREATE TABLE memos (
    memo_id      SERIAL PRIMARY KEY,
    org_id       INT REFERENCES organizations(org_id),
    sender_id    INT REFERENCES users(user_id),
    receiver_id  INT REFERENCES users(user_id),
    subject      TEXT NOT NULL,
    body         TEXT NOT NULL,
    is_read      BOOLEAN DEFAULT FALSE,
    parent_memo_id INT REFERENCES memos(memo_id),
    created_at   TIMESTAMP DEFAULT NOW()
);