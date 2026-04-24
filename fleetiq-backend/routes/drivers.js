const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// GET /api/drivers/me — current driver's profile + active vehicle
router.get('/me', auth, async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required.' });
    }
    try {
        const result = await pool.query(
            `SELECT d.*, u.name, u.email, u.created_at AS joined_at,
                    v.vehicle_id, v.plate_number, v.vehicle_type, v.status AS vehicle_status
             FROM drivers d
             JOIN users u ON u.user_id = d.user_id
             LEFT JOIN driver_vehicle_assignments dva
               ON dva.driver_id = d.driver_id AND dva.is_active = TRUE
             LEFT JOIN vehicles v ON v.vehicle_id = dva.vehicle_id
             WHERE d.driver_id = $1 AND u.org_id = $2`,
            [req.user.driver_id, req.user.org_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Driver not found.' });
        }
        res.json({ driver: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch driver profile.' });
    }
});

// GET /api/drivers/me/vehicles — all active vehicle assignments for current driver
router.get('/me/vehicles', auth, async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required.' });
    }
    try {
        const result = await pool.query(
            `SELECT v.vehicle_id, v.plate_number, v.vehicle_type, v.status AS vehicle_status,
                    dva.assigned_at
             FROM driver_vehicle_assignments dva
             JOIN vehicles v ON v.vehicle_id = dva.vehicle_id
             WHERE dva.driver_id = $1 AND dva.is_active = TRUE
             ORDER BY dva.assigned_at DESC`,
            [req.user.driver_id]
        );
        res.json({ vehicles: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch assigned vehicles.' });
    }
});

// GET /api/drivers — all drivers in org
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT d.*, u.name, u.email, u.is_active,
                    v.plate_number AS current_vehicle,
                    v.vehicle_type
             FROM drivers d
             JOIN users u ON u.user_id = d.user_id
             LEFT JOIN driver_vehicle_assignments dva
                    ON dva.driver_id = d.driver_id AND dva.is_active = TRUE
             LEFT JOIN vehicles v ON v.vehicle_id = dva.vehicle_id
             WHERE u.org_id = $1
             ORDER BY d.rating DESC`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch drivers.' });
    }
});

// GET /api/drivers/performance — driver performance view
router.get('/performance', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM driver_performance_view
             WHERE org_id = $1
             ORDER BY completed_deliveries DESC`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch driver performance.' });
    }
});

// GET /api/drivers/available — only available drivers
router.get('/available', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT d.driver_id, u.name, d.rating,
                    d.experience_years, d.total_deliveries
             FROM drivers d
             JOIN users u ON u.user_id = d.user_id
             WHERE u.org_id = $1
               AND d.availability_status = 'available'`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch available drivers.' });
    }
});

// GET /api/drivers/:id — single driver profile
router.get('/:id', auth, async (req, res) => {
    try {
        const driver = await pool.query(
            `SELECT d.*, u.name, u.email, u.created_at AS joined_at
             FROM drivers d
             JOIN users u ON u.user_id = d.user_id
             WHERE d.driver_id = $1 AND u.org_id = $2`,
            [req.params.id, req.user.org_id]
        );

        if (driver.rows.length === 0) {
            return res.status(404).json({ error: 'Driver not found.' });
        }

        // get their recent shipments
        const shipments = await pool.query(
            `SELECT shipment_id, status, priority,
                    destination_address, created_at, delivered_at
             FROM shipments
             WHERE driver_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [req.params.id]
        );

        res.json({
            driver:   driver.rows[0],
            shipments: shipments.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch driver.' });
    }
});

module.exports = router;