---------------------------------------------------------------------
--------------------------- Seed data -------------------------------


INSERT INTO organizations (name, industry, contact_email, phone) VALUES
('SwiftMove Logistics',  'Freight & Delivery',  'admin@swiftmove.com',  '+92-51-1234567'),
('PakCargo Express',     'E-commerce Logistics', 'admin@pakcargo.com',   '+92-42-2345678'),
('HillTop Couriers',     'Last Mile Delivery',   'admin@hilltop.com',    '+92-21-3456789');

INSERT INTO users (org_id, name, email, password_hash, role, is_active) VALUES

-- SwiftMove Logistics (org 1)
(1, 'Ahmed Raza',       'ahmed@swiftmove.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',   TRUE),
(1, 'Sara Khan',        'sara@swiftmove.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', TRUE),
(1, 'Bilal Mahmood',    'bilal@swiftmove.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', TRUE),
(1, 'Usman Ali',        'usman@swiftmove.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(1, 'Hamza Sheikh',     'hamza@swiftmove.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(1, 'Tariq Mehmood',    'tariq@swiftmove.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(1, 'Zara Siddiqui',    'zara@swiftmove.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(1, 'Faisal Qureshi',   'faisal@swiftmove.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(1, 'Nadia Iqbal',      'nadia@swiftmove.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(1, 'Kashif Nawaz',     'kashif@swiftmove.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),

-- PakCargo Express (org 2)
(2, 'Imran Hussain',    'imran@pakcargo.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',   TRUE),
(2, 'Ayesha Farooq',    'ayesha@pakcargo.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', TRUE),
(2, 'Omer Malik',       'omer@pakcargo.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', TRUE),
(2, 'Junaid Hassan',    'junaid@pakcargo.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(2, 'Sana Butt',        'sana@pakcargo.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(2, 'Rizwan Ahmed',     'rizwan@pakcargo.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(2, 'Hira Baig',        'hira@pakcargo.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(2, 'Waseem Akram',     'waseem@pakcargo.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(2, 'Maham Zahid',      'maham@pakcargo.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(2, 'Adeel Chaudhry',   'adeel@pakcargo.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),

-- HillTop Couriers (org 3)
(3, 'Shahid Afridi',    'shahid@hilltop.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',   TRUE),
(3, 'Rabia Noor',       'rabia@hilltop.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', TRUE),
(3, 'Kamran Akbar',     'kamran@hilltop.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', TRUE),
(3, 'Danish Rehman',    'danish@hilltop.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(3, 'Saima Javed',      'saima@hilltop.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(3, 'Asad Zaman',       'asad@hilltop.com',       '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(3, 'Farah Kamal',      'farah@hilltop.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(3, 'Nabeel Tariq',     'nabeel@hilltop.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(3, 'Lubna Aziz',       'lubna@hilltop.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE),
(3, 'Muneeb Sultan',    'muneeb@hilltop.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'driver',  TRUE);

INSERT INTO drivers (user_id, license_number, experience_years, availability_status, rating, total_deliveries) VALUES
-- SwiftMove drivers (user_ids 4-10)
(4,  'LHR-2019-04421', 5, 'available',   4.80, 142),
(5,  'LHR-2020-05512', 4, 'available',   4.60, 98),
(6,  'ISB-2018-03301', 6, 'available',   4.90, 201),
(7,  'KHI-2021-07823', 3, 'on_delivery', 4.30, 67),
(8,  'LHR-2017-02210', 7, 'available',   4.70, 315),
(9,  'ISB-2022-09934', 2, 'available',   4.20, 45),
(10, 'MUL-2019-06645', 5, 'off_duty',    4.50, 178),

-- PakCargo drivers (user_ids 14-20)
(14, 'LHR-2020-11001', 4, 'available',   4.75, 123),
(15, 'KHI-2019-08832', 5, 'on_delivery', 4.55, 167),
(16, 'ISB-2021-12243', 3, 'available',   4.40, 89),
(17, 'LHR-2018-07754', 6, 'available',   4.85, 234),
(18, 'KHI-2022-13365', 2, 'available',   4.10, 34),
(19, 'MUL-2020-09876', 4, 'off_duty',    4.60, 145),
(20, 'ISB-2019-10987', 5, 'available',   4.70, 189),

-- HillTop drivers (user_ids 24-30)
(24, 'KHI-2020-15501', 4, 'available',   4.65, 112),
(25, 'LHR-2021-16612', 3, 'on_delivery', 4.35, 78),
(26, 'ISB-2018-14423', 6, 'available',   4.95, 267),
(27, 'KHI-2019-17734', 5, 'available',   4.50, 156),
(28, 'LHR-2022-18845', 2, 'available',   4.25, 41),
(29, 'MUL-2020-19956', 4, 'off_duty',    4.70, 198),
(30, 'ISB-2021-21067', 3, 'available',   4.45, 93);

INSERT INTO vehicles (org_id, plate_number, vehicle_type, capacity_kg, purchase_date, status, current_location) VALUES
-- SwiftMove (org 1)
(1, 'LHR-1234', 'Truck',       5000, '2020-03-15', 'available',  ST_MakePoint(74.3587, 31.5204)::geography),
(1, 'LHR-5678', 'Van',         1500, '2021-06-20', 'in_use',     ST_MakePoint(74.2689, 31.4675)::geography),
(1, 'ISB-9012', 'Truck',       8000, '2019-11-10', 'available',  ST_MakePoint(73.0479, 33.6844)::geography),
(1, 'ISB-3456', 'Motorcycle',   150, '2022-01-05', 'available',  ST_MakePoint(73.0551, 33.7215)::geography),
(1, 'LHR-7890', 'Van',         2000, '2021-09-18', 'maintenance',ST_MakePoint(74.3200, 31.5000)::geography),

-- PakCargo (org 2)
(2, 'KHI-1111', 'Truck',       6000, '2020-05-22', 'available',  ST_MakePoint(67.0099, 24.8607)::geography),
(2, 'KHI-2222', 'Van',         1800, '2021-08-14', 'in_use',     ST_MakePoint(67.0500, 24.9000)::geography),
(2, 'LHR-3333', 'Truck',       7500, '2019-07-30', 'available',  ST_MakePoint(74.3000, 31.5500)::geography),
(2, 'MUL-4444', 'Van',         2200, '2022-03-11', 'available',  ST_MakePoint(71.4753, 30.1575)::geography),
(2, 'KHI-5555', 'Motorcycle',   200, '2022-06-25', 'available',  ST_MakePoint(67.0300, 24.8800)::geography),

-- HillTop (org 3)
(3, 'KHI-6666', 'Truck',       4500, '2020-09-08', 'available',  ST_MakePoint(67.0200, 24.8700)::geography),
(3, 'LHR-7777', 'Van',         1600, '2021-12-19', 'in_use',     ST_MakePoint(74.3400, 31.5100)::geography),
(3, 'ISB-8888', 'Truck',       9000, '2019-04-15', 'available',  ST_MakePoint(73.0600, 33.6900)::geography),
(3, 'PES-9999', 'Van',         2500, '2022-07-03', 'available',  ST_MakePoint(71.5249, 34.0151)::geography),
(3, 'MUL-1010', 'Motorcycle',   180, '2022-10-30', 'available',  ST_MakePoint(71.4800, 30.1600)::geography);

INSERT INTO warehouses (org_id, name, city, address, location, capacity_units, current_load) VALUES
-- SwiftMove (org 1)
(1, 'SwiftMove Lahore Central',   'Lahore',     'Plot 12, Sundar Industrial Estate',      ST_MakePoint(74.3587, 31.5204)::geography, 500, 120),
(1, 'SwiftMove Islamabad Hub',    'Islamabad',  'Street 4, I-9 Industrial Area',          ST_MakePoint(73.0479, 33.6844)::geography, 300, 85),
(1, 'SwiftMove Multan Depot',     'Multan',     'Bosan Road, Near Chenab Bridge',         ST_MakePoint(71.4753, 30.1575)::geography, 200, 40),

-- PakCargo (org 2)
(2, 'PakCargo Karachi Main',      'Karachi',    'SITE Area, Manghopir Road',              ST_MakePoint(67.0099, 24.8607)::geography, 800, 310),
(2, 'PakCargo Lahore East',       'Lahore',     'Raiwind Road, DHA Phase 6',              ST_MakePoint(74.4200, 31.4700)::geography, 400, 95),
(2, 'PakCargo Faisalabad Hub',    'Faisalabad', 'Jaranwala Road, Industrial Zone',        ST_MakePoint(73.0851, 31.4180)::geography, 350, 60),

-- HillTop (org 3)
(3, 'HillTop Karachi South',      'Karachi',    'Korangi Industrial Area, Sector 15',     ST_MakePoint(67.0800, 24.8300)::geography, 450, 180),
(3, 'HillTop Islamabad North',    'Islamabad',  'G-11 Markaz, Near Motorway',             ST_MakePoint(73.0200, 33.7100)::geography, 250, 55),
(3, 'HillTop Peshawar Gate',      'Peshawar',   'Ring Road, Industrial Estate Phase 2',   ST_MakePoint(71.5249, 34.0151)::geography, 300, 70),
(3, 'HillTop Rawalpindi Depot',   'Rawalpindi', 'Chakri Road, Near GT Road Junction',     ST_MakePoint(73.0500, 33.5800)::geography, 200, 30);

INSERT INTO manager_warehouse_assignments (manager_id, warehouse_id, assigned_date, is_active) VALUES
-- SwiftMove managers (user 2 = Sara, user 3 = Bilal)
(2, 1, '2023-01-10', TRUE),
(2, 2, '2023-01-10', TRUE),
(3, 3, '2023-02-15', TRUE),

-- PakCargo managers (user 12 = Ayesha, user 13 = Omer)
(12, 4, '2023-01-05', TRUE),
(12, 5, '2023-03-20', TRUE),
(13, 6, '2023-02-01', TRUE),

-- HillTop managers (user 22 = Rabia, user 23 = Kamran)
(22, 7,  '2023-01-15', TRUE),
(22, 8,  '2023-01-15', TRUE),
(23, 9,  '2023-03-10', TRUE),
(23, 10, '2023-03-10', TRUE);

INSERT INTO shipments (org_id, driver_id, vehicle_id, origin_warehouse_id, destination_address, destination_location, weight_kg, status, priority, created_at, estimated_delivery, delivered_at)
VALUES
-- SwiftMove delivered shipments (driver_ids 1-7, warehouse_ids 1-3)
(1,1,1,1,'House 5, Block A, Gulberg Lahore',         ST_MakePoint(74.3500,31.5100)::geography, 25.5,  'delivered', 'normal', NOW()-INTERVAL'10 days', NOW()-INTERVAL'8 days',  NOW()-INTERVAL'8 days'),
(1,2,2,1,'Shop 12, Liberty Market Lahore',           ST_MakePoint(74.3400,31.5200)::geography, 10.0,  'delivered', 'high',   NOW()-INTERVAL'9 days',  NOW()-INTERVAL'7 days',  NOW()-INTERVAL'7 days'),
(1,3,3,2,'Office 3, Blue Area Islamabad',            ST_MakePoint(73.0600,33.7200)::geography, 50.0,  'delivered', 'urgent', NOW()-INTERVAL'8 days',  NOW()-INTERVAL'6 days',  NOW()-INTERVAL'6 days'),
(1,4,4,2,'Plot 8, F-7 Markaz Islamabad',             ST_MakePoint(73.0700,33.7300)::geography, 8.5,   'delivered', 'low',    NOW()-INTERVAL'7 days',  NOW()-INTERVAL'5 days',  NOW()-INTERVAL'5 days'),
(1,5,1,3,'Street 2, Gulgasht Colony Multan',         ST_MakePoint(71.4800,30.1600)::geography, 32.0,  'delivered', 'normal', NOW()-INTERVAL'6 days',  NOW()-INTERVAL'4 days',  NOW()-INTERVAL'4 days'),
(1,6,2,1,'Flat 7, Johar Town Lahore',                ST_MakePoint(74.2800,31.4700)::geography, 15.5,  'delivered', 'high',   NOW()-INTERVAL'5 days',  NOW()-INTERVAL'3 days',  NOW()-INTERVAL'3 days'),
(1,7,3,2,'House 22, G-9 Islamabad',                  ST_MakePoint(73.0400,33.6900)::geography, 40.0,  'delivered', 'normal', NOW()-INTERVAL'4 days',  NOW()-INTERVAL'2 days',  NOW()-INTERVAL'2 days'),
(1,1,4,3,'Plot 15, New Multan Housing',              ST_MakePoint(71.4900,30.1700)::geography, 18.0,  'delivered', 'low',    NOW()-INTERVAL'12 days', NOW()-INTERVAL'10 days', NOW()-INTERVAL'10 days'),
(1,2,1,1,'House 3, Model Town Lahore',               ST_MakePoint(74.3300,31.5000)::geography, 22.0,  'delivered', 'high',   NOW()-INTERVAL'11 days', NOW()-INTERVAL'9 days',  NOW()-INTERVAL'8 days'),
(1,3,2,2,'Street 5, E-7 Islamabad',                  ST_MakePoint(73.0800,33.7400)::geography, 55.0,  'delivered', 'urgent', NOW()-INTERVAL'13 days', NOW()-INTERVAL'11 days', NOW()-INTERVAL'11 days'),

-- SwiftMove active shipments
(1,4,4,1,'House 9, DHA Phase 5 Lahore',              ST_MakePoint(74.4100,31.4800)::geography, 12.0,  'in_transit',     'high',   NOW()-INTERVAL'2 days',  NOW()+INTERVAL'1 day',  NULL),
(1,5,1,2,'Plot 3, PWD Colony Islamabad',             ST_MakePoint(73.0900,33.6600)::geography, 28.0,  'at_warehouse',   'normal', NOW()-INTERVAL'1 day',   NOW()+INTERVAL'2 days', NULL),
(1,6,2,3,'Street 8, Cantt Multan',                   ST_MakePoint(71.5000,30.1800)::geography, 9.5,   'assigned',       'low',    NOW()-INTERVAL'3 hours', NOW()+INTERVAL'1 day',  NULL),
(1,7,3,1,'House 14, Bahria Town Lahore',             ST_MakePoint(74.1800,31.3600)::geography, 45.0,  'out_for_delivery','urgent', NOW()-INTERVAL'1 day',  NOW(),                  NULL),
(1,1,4,2,'Flat 2, Sector F-11 Islamabad',            ST_MakePoint(73.0300,33.7000)::geography, 17.0,  'created',        'normal', NOW()-INTERVAL'1 hour',  NOW()+INTERVAL'3 days', NULL),

-- SwiftMove delayed shipments (estimated_delivery in the past, not delivered)
(1,2,1,1,'House 7, Gulshan Ravi Lahore',             ST_MakePoint(74.3600,31.5300)::geography, 33.0,  'in_transit',     'high',   NOW()-INTERVAL'5 days',  NOW()-INTERVAL'2 days', NULL),
(1,3,2,3,'Street 11, Shah Rukn-e-Alam Multan',       ST_MakePoint(71.4700,30.1500)::geography, 21.0,  'at_warehouse',   'urgent', NOW()-INTERVAL'6 days',  NOW()-INTERVAL'3 days', NULL),

-- PakCargo delivered shipments (driver_ids 8-14)
(2,8,6,4,'Shop 5, Tariq Road Karachi',               ST_MakePoint(67.0200,24.8500)::geography, 60.0,  'delivered', 'normal', NOW()-INTERVAL'10 days', NOW()-INTERVAL'8 days',  NOW()-INTERVAL'8 days'),
(2,9,7,4,'House 18, Clifton Block 4 Karachi',        ST_MakePoint(67.0300,24.8100)::geography, 14.0,  'delivered', 'high',   NOW()-INTERVAL'9 days',  NOW()-INTERVAL'7 days',  NOW()-INTERVAL'7 days'),
(2,10,8,5,'Plot 6, Garden Town Lahore',              ST_MakePoint(74.3200,31.5100)::geography, 38.0,  'delivered', 'urgent', NOW()-INTERVAL'8 days',  NOW()-INTERVAL'6 days',  NOW()-INTERVAL'5 days'),
(2,11,9,5,'Street 3, Gulberg III Lahore',            ST_MakePoint(74.3500,31.5300)::geography, 7.5,   'delivered', 'low',    NOW()-INTERVAL'7 days',  NOW()-INTERVAL'5 days',  NOW()-INTERVAL'5 days'),
(2,12,10,6,'House 9, Peoples Colony Faisalabad',     ST_MakePoint(73.0900,31.4300)::geography, 29.0,  'delivered', 'normal', NOW()-INTERVAL'6 days',  NOW()-INTERVAL'4 days',  NOW()-INTERVAL'4 days'),
(2,13,6,4,'Flat 12, PECHS Karachi',                  ST_MakePoint(67.0600,24.8700)::geography, 16.0,  'delivered', 'high',   NOW()-INTERVAL'5 days',  NOW()-INTERVAL'3 days',  NOW()-INTERVAL'3 days'),
(2,14,7,5,'Plot 20, Valencia Town Lahore',           ST_MakePoint(74.3800,31.5600)::geography, 52.0,  'delivered', 'normal', NOW()-INTERVAL'4 days',  NOW()-INTERVAL'2 days',  NOW()-INTERVAL'2 days'),
(2,8,8,6,'Street 7, Madina Town Faisalabad',         ST_MakePoint(73.0700,31.4500)::geography, 11.0,  'delivered', 'low',    NOW()-INTERVAL'12 days', NOW()-INTERVAL'10 days', NOW()-INTERVAL'10 days'),
(2,9,9,4,'House 3, North Nazimabad Karachi',         ST_MakePoint(67.0400,24.9200)::geography, 24.0,  'delivered', 'high',   NOW()-INTERVAL'11 days', NOW()-INTERVAL'9 days',  NOW()-INTERVAL'9 days'),
(2,10,10,5,'Flat 8, Johar Town Lahore',              ST_MakePoint(74.2900,31.4800)::geography, 43.0,  'delivered', 'urgent', NOW()-INTERVAL'13 days', NOW()-INTERVAL'11 days', NOW()-INTERVAL'10 days'),

-- PakCargo active shipments
(2,11,6,4,'Shop 3, Saddar Karachi',                  ST_MakePoint(67.0100,24.8600)::geography, 19.0,  'in_transit',      'high',   NOW()-INTERVAL'2 days',  NOW()+INTERVAL'1 day',  NULL),
(2,12,7,5,'House 5, Iqbal Town Lahore',              ST_MakePoint(74.2700,31.5400)::geography, 35.0,  'at_warehouse',    'normal', NOW()-INTERVAL'1 day',   NOW()+INTERVAL'2 days', NULL),
(2,13,8,6,'Plot 9, Canal Road Faisalabad',           ST_MakePoint(73.0600,31.4200)::geography, 8.0,   'assigned',        'low',    NOW()-INTERVAL'4 hours', NOW()+INTERVAL'1 day',  NULL),
(2,14,9,4,'House 11, Defence Karachi',               ST_MakePoint(67.0700,24.8000)::geography, 62.0,  'out_for_delivery','urgent', NOW()-INTERVAL'1 day',  NOW(),                  NULL),
(2,8,10,5,'Street 4, Bahria Town Lahore',            ST_MakePoint(74.1900,31.3700)::geography, 13.0,  'created',         'normal', NOW()-INTERVAL'2 hours', NOW()+INTERVAL'3 days', NULL),

-- PakCargo delayed
(2,9,6,4,'Flat 6, Gulshan-e-Iqbal Karachi',         ST_MakePoint(67.0900,24.9300)::geography, 27.0,  'in_transit',      'high',   NOW()-INTERVAL'5 days',  NOW()-INTERVAL'2 days', NULL),
(2,10,7,6,'House 2, Millat Town Faisalabad',         ST_MakePoint(73.0500,31.4400)::geography, 44.0,  'at_warehouse',    'urgent', NOW()-INTERVAL'6 days',  NOW()-INTERVAL'3 days', NULL),

-- HillTop delivered shipments (driver_ids 15-21)
(3,15,11,7,'House 8, Gulshan-e-Hadeed Karachi',      ST_MakePoint(67.1200,24.8200)::geography, 31.0,  'delivered', 'normal', NOW()-INTERVAL'10 days', NOW()-INTERVAL'8 days',  NOW()-INTERVAL'8 days'),
(3,16,12,8,'Plot 4, G-13 Islamabad',                 ST_MakePoint(73.0100,33.6700)::geography, 17.0,  'delivered', 'high',   NOW()-INTERVAL'9 days',  NOW()-INTERVAL'7 days',  NOW()-INTERVAL'7 days'),
(3,17,13,9,'Street 6, Hayatabad Peshawar',           ST_MakePoint(71.4900,34.0100)::geography, 48.0,  'delivered', 'urgent', NOW()-INTERVAL'8 days',  NOW()-INTERVAL'6 days',  NOW()-INTERVAL'5 days'),
(3,18,14,9,'House 14, University Town Peshawar',     ST_MakePoint(71.5100,34.0200)::geography, 9.0,   'delivered', 'low',    NOW()-INTERVAL'7 days',  NOW()-INTERVAL'5 days',  NOW()-INTERVAL'5 days'),
(3,19,15,10,'Flat 3, Satellite Town Rawalpindi',     ST_MakePoint(73.0600,33.5900)::geography, 26.0,  'delivered', 'normal', NOW()-INTERVAL'6 days',  NOW()-INTERVAL'4 days',  NOW()-INTERVAL'4 days'),
(3,20,11,7,'Shop 9, Malir Karachi',                  ST_MakePoint(67.1900,24.8900)::geography, 14.0,  'delivered', 'high',   NOW()-INTERVAL'5 days',  NOW()-INTERVAL'3 days',  NOW()-INTERVAL'3 days'),
(3,21,12,8,'House 7, F-8 Islamabad',                 ST_MakePoint(73.0500,33.7200)::geography, 39.0,  'delivered', 'normal', NOW()-INTERVAL'4 days',  NOW()-INTERVAL'2 days',  NOW()-INTERVAL'2 days'),
(3,15,13,9,'Plot 11, Ring Road Peshawar',            ST_MakePoint(71.5300,34.0000)::geography, 20.0,  'delivered', 'low',    NOW()-INTERVAL'12 days', NOW()-INTERVAL'10 days', NOW()-INTERVAL'10 days'),
(3,16,14,10,'Street 2, Rawalpindi Cantt',            ST_MakePoint(73.0700,33.6000)::geography, 57.0,  'delivered', 'high',   NOW()-INTERVAL'11 days', NOW()-INTERVAL'9 days',  NOW()-INTERVAL'8 days'),
(3,17,15,7,'House 5, Lyari Karachi',                 ST_MakePoint(67.0000,24.8500)::geography, 33.0,  'delivered', 'urgent', NOW()-INTERVAL'13 days', NOW()-INTERVAL'11 days', NOW()-INTERVAL'11 days'),

-- HillTop active shipments
(3,18,11,7,'Flat 1, Scheme 33 Karachi',              ST_MakePoint(67.1000,24.9500)::geography, 22.0,  'in_transit',      'high',   NOW()-INTERVAL'2 days',  NOW()+INTERVAL'1 day',  NULL),
(3,19,12,8,'House 3, I-8 Islamabad',                 ST_MakePoint(73.0800,33.7000)::geography, 41.0,  'at_warehouse',    'normal', NOW()-INTERVAL'1 day',   NOW()+INTERVAL'2 days', NULL),
(3,20,13,9,'Plot 7, Cantonment Peshawar',            ST_MakePoint(71.5000,34.0300)::geography, 11.0,  'assigned',        'low',    NOW()-INTERVAL'5 hours', NOW()+INTERVAL'1 day',  NULL),
(3,21,14,10,'Street 9, Adiala Road Rawalpindi',      ST_MakePoint(73.0400,33.5700)::geography, 58.0,  'out_for_delivery','urgent', NOW()-INTERVAL'1 day',  NOW(),                  NULL),
(3,15,15,8,'House 6, E-11 Islamabad',                ST_MakePoint(73.0200,33.7300)::geography, 16.0,  'created',         'normal', NOW()-INTERVAL'3 hours', NOW()+INTERVAL'3 days', NULL),

-- HillTop delayed
(3,16,11,7,'Flat 9, Surjani Town Karachi',           ST_MakePoint(67.0500,24.9800)::geography, 36.0,  'in_transit',      'high',   NOW()-INTERVAL'5 days',  NOW()-INTERVAL'2 days', NULL),
(3,17,12,10,'House 12, Dhoke Hassu Rawalpindi',      ST_MakePoint(73.0300,33.5600)::geography, 23.0,  'at_warehouse',    'urgent', NOW()-INTERVAL'6 days',  NOW()-INTERVAL'3 days', NULL);

INSERT INTO shipment_items (shipment_id, item_name, quantity, weight, category) VALUES
(1,  'Electronics - Laptop',      1,  2.5,  'Electronics'),
(1,  'Accessories - Mouse',       2,  0.3,  'Electronics'),
(2,  'Clothing - Shirts',         5,  2.0,  'Apparel'),
(3,  'Industrial Parts',          10, 45.0, 'Industrial'),
(4,  'Books',                     8,  4.0,  'Stationery'),
(5,  'Home Appliance - Blender',  2,  6.0,  'Appliances'),
(6,  'Medicines',                 20, 3.0,  'Healthcare'),
(7,  'Mobile Phones',             4,  2.0,  'Electronics'),
(8,  'Office Furniture - Chair',  1,  15.0, 'Furniture'),
(9,  'Grocery Items',             15, 8.0,  'Food'),
(10, 'Auto Parts',                5,  50.0, 'Automotive'),
(11, 'Shoes',                     6,  3.0,  'Apparel'),
(12, 'Computer Monitor',          2,  12.0, 'Electronics'),
(13, 'Stationery Pack',           30, 4.5,  'Stationery'),
(14, 'Fragile - Glassware',       10, 20.0, 'Fragile'),
(15, 'Documents',                 1,  0.5,  'Documents'),
(18, 'Textile Rolls',             5,  55.0, 'Industrial'),
(19, 'Cosmetics',                 12, 3.0,  'Healthcare'),
(20, 'Power Tools',               3,  18.0, 'Industrial'),
(21, 'Sports Equipment',          4,  7.5,  'Sports');

INSERT INTO vehicle_maintenance (vehicle_id, maintenance_type, description, cost, performed_by, performed_at) VALUES
(1,  'routine',    'Oil change and filter replacement',         8500,  'Ali Motors Lahore',      NOW()-INTERVAL'30 days'),
(1,  'inspection', 'Annual road safety inspection',             3000,  'Punjab Transport Dept',  NOW()-INTERVAL'90 days'),
(2,  'repair',     'Brake pad replacement',                     12000, 'Quick Fix Garage',       NOW()-INTERVAL'15 days'),
(3,  'routine',    'Oil change and tire rotation',              9000,  'FastLane Islamabad',     NOW()-INTERVAL'45 days'),
(3,  'emergency',  'Engine overheating - coolant leak fixed',   35000, 'National Auto Works',    NOW()-INTERVAL'20 days'),
(4,  'routine',    'Chain and brake adjustment',                2000,  'City Bikes Workshop',    NOW()-INTERVAL'10 days'),
(5,  'repair',     'Transmission belt replacement',             18000, 'Trans Auto Lahore',      NOW()-INTERVAL'5 days'),
(6,  'routine',    'Oil change and AC service',                 11000, 'Karachi Auto Hub',       NOW()-INTERVAL'25 days'),
(7,  'inspection', 'Fitness certificate renewal',               4500,  'Sindh Transport Dept',   NOW()-INTERVAL'60 days'),
(8,  'repair',     'Clutch plate replacement',                  22000, 'Motor City Lahore',      NOW()-INTERVAL'35 days'),
(11, 'routine',    'Full service - oil, filters, belts',        13000, 'Karachi Service Centre', NOW()-INTERVAL'20 days'),
(13, 'emergency',  'Tyre burst on highway - all 4 replaced',   28000, 'Peshawar Tyre House',    NOW()-INTERVAL'8 days'),
(14, 'routine',    'Oil change and wiper replacement',          7500,  'Rawalpindi Auto Works',  NOW()-INTERVAL'40 days'),
(15, 'inspection', 'Pre-monsoon vehicle inspection',            3500,  'Punjab Transport Dept',  NOW()-INTERVAL'55 days');

INSERT INTO warehouse_shipments (shipment_id, warehouse_id, arrival_time, departure_time, handler_notes) VALUES
(3,  1, NOW()-INTERVAL'8 days',  NOW()-INTERVAL'7 days 12 hours', 'Passed through Lahore hub en route to Islamabad'),
(7,  1, NOW()-INTERVAL'4 days',  NOW()-INTERVAL'3 days 6 hours',  'Sorted and dispatched same day'),
(12, 2, NOW()-INTERVAL'1 day',   NULL,                             'Awaiting dispatch clearance'),
(17, 1, NOW()-INTERVAL'5 days',  NOW()-INTERVAL'4 days',          'Delayed due to vehicle breakdown'),
(20, 5, NOW()-INTERVAL'8 days',  NOW()-INTERVAL'7 days',          'Transferred from Karachi hub'),
(28, 4, NOW()-INTERVAL'11 days', NOW()-INTERVAL'10 days',         'In transit stop overnight'),
(32, 5, NOW()-INTERVAL'1 day',   NULL,                            'Currently being processed'),
(37, 4, NOW()-INTERVAL'5 days',  NOW()-INTERVAL'4 days',          'Delayed - custom clearance'),
(42, 7, NOW()-INTERVAL'8 days',  NOW()-INTERVAL'7 days',          'Karachi to Islamabad route stop');



----------------------------------------------------------------------------------
