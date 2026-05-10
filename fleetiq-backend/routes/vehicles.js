const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

//---- Role Based Access Control Middleware ----

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

// GET /api/vehicles
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM fleet_utilization_view
             WHERE org_id = $1
             ORDER BY current_status, plate_number`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch vehicles.' });
    }
});

// GET /api/vehicles/available
router.get('/available', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT vehicle_id, plate_number, vehicle_type, capacity_kg
             FROM vehicles
             WHERE org_id = $1 AND status = 'available'`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch available vehicles.' });
    }
});

// GET /api/vehicles/map
router.get('/map', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT vehicle_id, plate_number, vehicle_type, status,
                    ST_Y(current_location::geometry) AS latitude,
                    ST_X(current_location::geometry) AS longitude
             FROM vehicles
             WHERE org_id = $1 AND current_location IS NOT NULL`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch vehicle locations.' });
    }
});

// POST /api/vehicles - admin adds vehicle

//only admin can add vehicles, so we use the adminOnly middleware to protect this route.

router.post('/', auth, adminOnly, async (req, res) => {
    const { plate_number, vehicle_type,
            capacity_kg, purchase_date } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO vehicles
                (org_id, plate_number, vehicle_type,
                 capacity_kg, purchase_date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.user.org_id, plate_number, vehicle_type,
             capacity_kg, purchase_date]
        );
        res.status(201).json({
            message: 'Vehicle added.',
            vehicle: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add vehicle.' });
    }
});

// PATCH /api/vehicles/:id/location - driver pushes live GPS position for their assigned vehicle

/*

real time GPS tracking of vehicles 

*/

router.patch('/:id/location', auth, async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required.' });
    }
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
        return res.status(400).json({ error: 'latitude and longitude required.' });
    }
    try {
        const check = await pool.query(
            `SELECT 1 FROM driver_vehicle_assignments
             WHERE driver_id = $1 AND vehicle_id = $2 AND is_active = TRUE`,
            [req.user.driver_id, req.params.id]
        );
        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'You are not assigned to this vehicle.' });
        }
        await pool.query(
            `UPDATE vehicles
             SET current_location = ST_MakePoint($1, $2)::geography
             WHERE vehicle_id = $3 AND org_id = $4`,
            [parseFloat(longitude), parseFloat(latitude),
             req.params.id, req.user.org_id]
        );
        res.json({ message: 'Location updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update location.' });
    }
});

// PATCH /api/vehicles/:id - admin updates vehicle
router.patch('/:id', auth, adminOnly, async (req, res) => {
    const { plate_number, vehicle_type, capacity_kg } = req.body;
    try {
        const result = await pool.query(
            `UPDATE vehicles
             SET plate_number  = COALESCE($1, plate_number),
                 vehicle_type  = COALESCE($2, vehicle_type),
                 capacity_kg   = COALESCE($3, capacity_kg)
             WHERE vehicle_id = $4 AND org_id = $5
             RETURNING *`,
            [plate_number, vehicle_type, capacity_kg,
             req.params.id, req.user.org_id]
        );
        res.json({ message: 'Vehicle updated.', vehicle: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update vehicle.' });
    }
});

module.exports = router;