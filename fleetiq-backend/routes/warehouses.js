const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');


//admin only middleware
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

// GET /api/warehouses
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM warehouse_throughput_view
             WHERE org_id = $1 ORDER BY warehouse_name`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch warehouses.' });
    }
});

// GET /api/warehouses/my — manager sees only assigned warehouses
router.get('/my', auth, async (req, res) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Manager access required.' });
    }
    try {
        const result = await pool.query(
            `SELECT wtv.*
             FROM warehouse_throughput_view wtv
             JOIN manager_warehouse_assignments mwa
               ON mwa.warehouse_id = wtv.warehouse_id
              AND mwa.is_active = TRUE
             WHERE wtv.org_id = $1
               AND mwa.manager_id = $2
             ORDER BY wtv.warehouse_name`,
            [req.user.org_id, req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch manager warehouses.' });
    }
});

// GET /api/warehouses/map
//PostGIS function ST_Y gets latitude and ST_X gets longitude from the location column,
//which is stored as a geography point type.

router.get('/map', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT warehouse_id, name, city, address,
                    capacity_units, current_load,
                    ST_Y(location::geometry) AS latitude,
                    ST_X(location::geometry) AS longitude
             FROM warehouses
             WHERE org_id = $1 AND location IS NOT NULL`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch warehouse locations.' });
    }
});

// GET /api/warehouses/nearest?lat=&lng=


// This endpoint finds the nearest warehouse to the given latitude and longitude.
// It uses the PostGIS <-> operator to order by distance and returns the closest one.
// calculates distance between the warehouse location and the provided lat/lng using ST_Distance


router.get('/nearest', auth, async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng required.' });
    }
    try {
        const result = await pool.query(
            `SELECT * FROM get_nearest_warehouse($1, $2, $3)`,
            [parseFloat(lat), parseFloat(lng), req.user.org_id]
        );
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to find nearest warehouse.' });
    }
});

// GET /api/warehouses/within-radius?lat=&lng=&km=
// Returns all warehouses within km kilometres of the given point, ordered nearest-first.
// Uses PostGIS ST_DWithin for index-assisted filtering + ST_Distance for exact km values.
router.get('/within-radius', auth, async (req, res) => {
    const { lat, lng, km = 100 } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required.' });
    }
    try {
        const result = await pool.query(
            `SELECT * FROM warehouses_within_radius($1, $2, $3, $4)`,
            [parseFloat(lat), parseFloat(lng), parseFloat(km), req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to find warehouses within radius.' });
    }
});

// GET /api/warehouses/forecast
// Returns current load + pending inbound shipments per warehouse so the admin
// can spot which warehouses are about to fill up before shipments actually arrive.
router.get('/forecast', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM warehouse_load_forecast_view
             WHERE org_id = $1
             ORDER BY forecast_load_pct DESC`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch warehouse forecast.' });
    }
});

// GET /api/warehouses/overflow-alerts
// For each warehouse forecast above 80% capacity, uses ST_Distance (PostGIS) to find
// the nearest alternative warehouse still under 70% forecast load.
router.get('/overflow-alerts', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `WITH overloaded AS (
                SELECT wlf.warehouse_id,
                       wlf.warehouse_name,
                       wlf.city,
                       wlf.current_load_pct,
                       wlf.forecast_load_pct,
                       wlf.capacity_units,
                       ST_Y(w.location::geometry) AS latitude,
                       ST_X(w.location::geometry) AS longitude,
                       w.location
                FROM warehouse_load_forecast_view wlf
                JOIN warehouses w ON w.warehouse_id = wlf.warehouse_id
                WHERE wlf.org_id = $1
                  AND wlf.forecast_load_pct >= 80
            ),
            candidates AS (
                SELECT wlf.warehouse_id AS alt_warehouse_id,
                       wlf.warehouse_name AS alt_name,
                       wlf.city AS alt_city,
                       wlf.forecast_load_pct AS alt_load_pct,
                       wlf.capacity_units AS alt_capacity,
                       w.location AS alt_location
                FROM warehouse_load_forecast_view wlf
                JOIN warehouses w ON w.warehouse_id = wlf.warehouse_id
                WHERE wlf.org_id = $1
                  AND wlf.forecast_load_pct < 70
            )
            SELECT
                o.warehouse_id,
                o.warehouse_name,
                o.city,
                ROUND(o.current_load_pct::numeric, 1)    AS current_load_pct,
                ROUND(o.forecast_load_pct::numeric, 1)   AS forecast_load_pct,
                o.capacity_units,
                o.latitude,
                o.longitude,
                a.alt_warehouse_id,
                a.alt_name,
                a.alt_city,
                ROUND(a.alt_load_pct::numeric, 1)        AS alt_load_pct,
                a.alt_capacity,
                ROUND((ST_Distance(o.location, a.alt_location) / 1000)::numeric, 1) AS distance_km
            FROM overloaded o
            CROSS JOIN LATERAL (
                SELECT * FROM candidates a
                ORDER BY ST_Distance(o.location, a.alt_location) ASC
                LIMIT 1
            ) a
            ORDER BY o.forecast_load_pct DESC`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch overflow alerts.' });
    }
});

// GET /api/warehouses/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const warehouse = await pool.query(
            `SELECT w.*,
                    ST_Y(w.location::geometry) AS latitude,
                    ST_X(w.location::geometry) AS longitude
             FROM warehouses w
             WHERE w.warehouse_id = $1 AND w.org_id = $2`,
            [req.params.id, req.user.org_id]
        );
        if (warehouse.rows.length === 0) {
            return res.status(404).json({ error: 'Warehouse not found.' });
        }

        // get assigned managers
        const managers = await pool.query(
            `SELECT u.user_id, u.name, u.email,
                    mwa.assigned_date, mwa.is_active
             FROM manager_warehouse_assignments mwa
             JOIN users u ON u.user_id = mwa.manager_id
             WHERE mwa.warehouse_id = $1 AND mwa.is_active = TRUE`,
            [req.params.id]
        );

        // get active shipments
        const shipments = await pool.query(
            `SELECT s.shipment_id, s.status, s.priority,
                    s.destination_address, u.name AS driver_name
             FROM shipments s
             LEFT JOIN drivers d ON d.driver_id = s.driver_id
             LEFT JOIN users u   ON u.user_id   = d.user_id
             WHERE s.origin_warehouse_id = $1
               AND s.status NOT IN ('delivered','cancelled')
             ORDER BY s.priority DESC`,
            [req.params.id]
        );

        res.json({
            warehouse: warehouse.rows[0],
            managers:  managers.rows,
            shipments: shipments.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch warehouse.' });
    }
});

// POST /api/warehouses — admin creates warehouse
router.post('/', auth, adminOnly, async (req, res) => {
    const { name, city, address, latitude,
            longitude, capacity_units } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO warehouses
                (org_id, name, city, address, location, capacity_units)
             VALUES ($1, $2, $3, $4,
                 ST_MakePoint($5, $6)::geography, $7)
             RETURNING *`,
            [req.user.org_id, name, city, address,
             parseFloat(longitude), parseFloat(latitude),
             capacity_units]
        );
        res.status(201).json({
            message:   'Warehouse created.',
            warehouse: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create warehouse.' });
    }
});

// PATCH /api/warehouses/:id — admin updates warehouse
router.patch('/:id', auth, adminOnly, async (req, res) => {
    const { name, city, address, capacity_units } = req.body;
    try {
        const result = await pool.query(
            `UPDATE warehouses
             SET name           = COALESCE($1, name),
                 city           = COALESCE($2, city),
                 address        = COALESCE($3, address),
                 capacity_units = COALESCE($4, capacity_units)
             WHERE warehouse_id = $5 AND org_id = $6
             RETURNING *`,
            [name, city, address, capacity_units,
             req.params.id, req.user.org_id]
        );
        res.json({ message: 'Warehouse updated.', warehouse: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update warehouse.' });
    }
});

// POST /api/warehouses/:id/assign-manager — admin assigns manager
router.post('/:id/assign-manager', auth, adminOnly, async (req, res) => {
    const { manager_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // verify manager belongs to same org
        const check = await client.query(
            `SELECT user_id FROM users
             WHERE user_id = $1 AND org_id = $2 AND role = 'manager'`,
            [manager_id, req.user.org_id]
        );
        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'User is not a manager in this organization.'
            });
        }

        // check not already assigned
        const existing = await client.query(
            `SELECT assignment_id FROM manager_warehouse_assignments
             WHERE manager_id = $1 AND warehouse_id = $2 AND is_active = TRUE`,
            [manager_id, req.params.id]
        );
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'Manager already assigned to this warehouse.'
            });
        }

        await client.query(
            `INSERT INTO manager_warehouse_assignments
                (manager_id, warehouse_id, assigned_date, is_active)
             VALUES ($1, $2, CURRENT_DATE, TRUE)`,
            [manager_id, req.params.id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Manager assigned to warehouse.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to assign manager.' });
    } finally {
        client.release();
    }
});

// DELETE /api/warehouses/:id/managers/:manager_id — remove manager
router.delete('/:id/managers/:manager_id', auth, adminOnly, async (req, res) => {
    try {
        await pool.query(
            `UPDATE manager_warehouse_assignments
             SET is_active = FALSE
             WHERE warehouse_id = $1 AND manager_id = $2`,
            [req.params.id, req.params.manager_id]
        );
        res.json({ message: 'Manager removed from warehouse.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to remove manager.' });
    }
});

module.exports = router;