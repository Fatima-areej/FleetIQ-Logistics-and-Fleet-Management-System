# FleetIQ Setup Guide

## Prerequisites — install these first
1. Node.js — https://nodejs.org (download LTS version)
2. PostgreSQL 15 — https://www.postgresql.org/download/
3. pgAdmin 4 — comes with PostgreSQL installer

## Step 1 — Clone the project
Open terminal and run:
git clone https://github.com/YOUR_USERNAME/fleetiq-adbms.git
cd fleetiq-adbms

## Step 2 — Set up the database
1. Open pgAdmin
2. Create a new database called: fleetiq
3. Open Query Tool in pgAdmin
4. Run each file in this exact order:
   - database/01_extensions.sql
   - database/02_enums.sql
   - database/03_schema.sql
   - database/04_indexes.sql
   - database/05_triggers.sql
   - database/06_procedures.sql
   - database/07_views.sql
   - database/08_access_control.sql
   - database/09_seed.sql

## Step 3 — Set up the backend
1. Open terminal in the fleetiq-backend folder
2. Run: npm install
3. Create a file called .env with this content:

PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fleetiq
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
JWT_SECRET=fleetiq_super_secret_jwt_key_2024

4. Run: npm run dev
5. You should see: FleetIQ server running on port 5000

## Step 4 — Set up the frontend
1. Open a NEW terminal in the fleetiq-frontend folder
2. Run: npm install
3. Run: npm start
4. Browser opens at http://localhost:3000

## Test accounts (password: password123)
- Admin:   ahmed@swiftmove.com
- Manager: sara@swiftmove.com
- Driver:  usman@swiftmove.com