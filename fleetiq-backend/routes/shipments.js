/*

handles all shipment related API endpoints under /api/shipments.
Includes routes for:
- getting shipments (with different filters)
- creating new shipments
- assigning drivers and vehicles
- updating status, cancelling, transferring to warehouse, etc.

*/

const express = require('express');
const router  = express.Router();                           //explained in auth.js
const pool    = require('../db');
const auth    = require('../middleware/auth');

// GET /api/shipments — get all shipments for the org

//fetch shipments, but behaviour depends on role:
// if driver, only get their shipments; if admin/manager, get all shipments in org.

router.get('/', auth, async (req, res) => {
    try {

        // set the current user id in the session for use in triggers/functions
        await pool.query(`SET app.current_user_id = '${req.user.user_id}'`);

        let query;
        let params;

        if (req.user.role === 'driver') {
            query = `
                SELECT * FROM active_shipments_view        
                WHERE driver_id = $1
                ORDER BY created_at DESC`;
            params = [req.user.driver_id];              //uses view created in db
        } else {
            query = `
                SELECT * FROM active_shipments_view
                WHERE org_id = $1
                ORDER BY created_at DESC`;
            params = [req.user.org_id];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch shipments.' });
    }
});

// GET /api/shipments/all — includes delivered and cancelled

router.get('/all', auth, async (req, res) => {
    try {
        let query;
        let params;

        // left join so that even if no driver assigned yet, the shipment will still show 

        if (req.user.role === 'driver') {
            query = `
                SELECT s.*, u.name AS driver_name, v.plate_number,
                       w.name AS origin_warehouse
                FROM shipments s
                LEFT JOIN drivers d    ON d.driver_id    = s.driver_id
                LEFT JOIN users u      ON u.user_id      = d.user_id
                LEFT JOIN vehicles v   ON v.vehicle_id   = s.vehicle_id
                LEFT JOIN warehouses w ON w.warehouse_id = s.origin_warehouse_id
                WHERE s.driver_id = $1
                ORDER BY s.created_at DESC`;
            params = [req.user.driver_id];
        } else {
            query = `
                SELECT s.*, u.name AS driver_name, v.plate_number,
                       w.name AS origin_warehouse
                FROM shipments s
                LEFT JOIN drivers d    ON d.driver_id    = s.driver_id
                LEFT JOIN users u      ON u.user_id      = d.user_id
                LEFT JOIN vehicles v   ON v.vehicle_id   = s.vehicle_id
                LEFT JOIN warehouses w ON w.warehouse_id = s.origin_warehouse_id
                WHERE s.org_id = $1
                ORDER BY s.created_at DESC`;
            params = [req.user.org_id];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch shipments.' });
    }
});

// GET /api/shipments/delayed — delayed shipments for org

router.get('/delayed', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM delayed_shipments_view WHERE org_id = $1`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch delayed shipments.' });
    }
});

// GET /api/shipments/:id — get single shipment with full history

router.get('/:id', auth, async (req, res) => {
    try {
        const shipment = await pool.query(
            `SELECT s.*, u.name AS driver_name, v.plate_number,
                    v.vehicle_type, w.name AS origin_warehouse,
                    w.city AS origin_city
             FROM shipments s
             LEFT JOIN drivers d    ON d.driver_id    = s.driver_id
             LEFT JOIN users u      ON u.user_id      = d.user_id
             LEFT JOIN vehicles v   ON v.vehicle_id   = s.vehicle_id
             LEFT JOIN warehouses w ON w.warehouse_id = s.origin_warehouse_id
             WHERE s.shipment_id = $1 AND s.org_id = $2`,
            [req.params.id, req.user.org_id]
        );

        if (shipment.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found.' });
        }

        // get status history
        const history = await pool.query(
            `SELECT ssh.*, u.name AS updated_by_name
             FROM shipment_status_history ssh
             LEFT JOIN users u ON u.user_id = ssh.updated_by
             WHERE ssh.shipment_id = $1
             ORDER BY ssh.changed_at ASC`,
            [req.params.id]
        );

        // get items
        const items = await pool.query(
            `SELECT * FROM shipment_items WHERE shipment_id = $1`,
            [req.params.id]
        );

        // get warehouse stops
        const stops = await pool.query(
            `SELECT ws.*, w.name AS warehouse_name, w.city
             FROM warehouse_shipments ws
             JOIN warehouses w ON w.warehouse_id = ws.warehouse_id
             WHERE ws.shipment_id = $1
             ORDER BY ws.arrival_time ASC`,
            [req.params.id]
        );

        res.json({
            shipment:  shipment.rows[0],
            history:   history.rows,
            items:     items.rows,
            stops:     stops.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch shipment details.' });
    }
});

// POST /api/shipments — create new shipment
router.post('/', auth, async (req, res) => {
    const {
        origin_warehouse_id, destination_address,
        destination_lat, destination_lng,
        weight_kg, priority, estimated_delivery, items
    } = req.body;

    // grab a dedicated client from the pool for transaction control
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // insert the shipment
        const result = await client.query(
            `INSERT INTO shipments
                (org_id, origin_warehouse_id, destination_address,
                 destination_location, weight_kg, priority, estimated_delivery)
             VALUES ($1, $2, $3,
                 ST_MakePoint($4, $5)::geography,
                 $6, $7, $8)
             RETURNING *`,
            [req.user.org_id, origin_warehouse_id, destination_address,
             destination_lng, destination_lat,
             weight_kg, priority || 'normal', estimated_delivery]
        );

        const newShipment = result.rows[0];

        // insert all items — if any fail, the whole thing rolls back
        // TRANSACTION CONTROL: if any of these inserts fail
        // the catch block will trigger and the transaction will roll back
        // ensuring no partial data is saved. 
        // This maintains data integrity; we won't have a shipment without its items or vice versa.

        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(
                    `INSERT INTO shipment_items
                        (shipment_id, item_name, quantity, weight, category)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [newShipment.shipment_id, item.item_name,
                     item.quantity, item.weight, item.category]
                );
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            message:  'Shipment created successfully.',
            shipment: newShipment
        });

    } catch (err) {
        // if anything failed, undo everything — no partial data
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to create shipment. All changes rolled back.' });
    } finally {
        // always release client back to the pool, even if error occurred
        client.release();
    }
});

// POST /api/shipments/:id/assign — assign driver and vehicle
router.post('/:id/assign', auth, async (req, res) => {
    const { driver_id, vehicle_id } = req.body;
    try {

        // stored procedure to assign shipments 

        await pool.query(
            `CALL assign_shipment($1, $2, $3)`,
            [req.params.id, driver_id, vehicle_id]
        );
        res.json({ message: 'Shipment assigned successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/shipments/:id/complete — mark as delivered
router.post('/:id/complete', auth, async (req, res) => {

    //stored procedure to complete delivery
    try {
        await pool.query(`CALL complete_delivery($1)`, [req.params.id]);
        res.json({ message: 'Shipment marked as delivered.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/shipments/:id/status — update status manually
router.patch('/:id/status', auth, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query(
            `UPDATE shipments SET status = $1 WHERE shipment_id = $2 AND org_id = $3`,
            [status, req.params.id, req.user.org_id]
        );
        res.json({ message: 'Status updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update status.' });
    }
});

// PATCH /api/shipments/:id/cancel
router.patch('/:id/cancel', auth, async (req, res) => {
    try {
        await pool.query(
            `UPDATE shipments
             SET status = 'cancelled'
             WHERE shipment_id = $1 AND org_id = $2`,
            [req.params.id, req.user.org_id]
        );
        res.json({ message: 'Shipment cancelled.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to cancel shipment.' });
    }
});

// POST /api/shipments/:id/transfer
router.post('/:id/transfer', auth, async (req, res) => {
    const { warehouse_id } = req.body;
    try {
        await pool.query(
            `CALL transfer_to_warehouse($1, $2)`,
            [req.params.id, warehouse_id]
        );
        res.json({ message: 'Shipment transferred to warehouse.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/shipments/:id/suggest-assignment
router.get('/:id/suggest-assignment', auth, async (req, res) => {
    try {
        // get shipment origin warehouse location
        const shipment = await pool.query(
            `SELECT s.*, w.location AS warehouse_location
             FROM shipments s
             JOIN warehouses w ON w.warehouse_id = s.origin_warehouse_id
             WHERE s.shipment_id = $1 AND s.org_id = $2`,
            [req.params.id, req.user.org_id]
        );

        if (shipment.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found.' });
        }

        // best driver = available + highest rating + least active deliveries
        const bestDriver = await pool.query(
            `SELECT d.driver_id, u.name, d.rating,
                    d.total_deliveries, d.experience_years
             FROM drivers d
             JOIN users u ON u.user_id = d.user_id
             WHERE u.org_id = $1
               AND d.availability_status = 'available'
             ORDER BY d.rating DESC, d.total_deliveries ASC
             LIMIT 1`,
            [req.user.org_id]
        );

        // best vehicle = available + capacity fits shipment weight
        const bestVehicle = await pool.query(
            `SELECT vehicle_id, plate_number, vehicle_type, capacity_kg
             FROM vehicles
             WHERE org_id = $1
               AND status = 'available'
               AND capacity_kg >= $2
             ORDER BY capacity_kg ASC
             LIMIT 1`,
            [req.user.org_id, shipment.rows[0].weight_kg || 0]
        );

        res.json({
            suggested_driver:  bestDriver.rows[0]  || null,
            suggested_vehicle: bestVehicle.rows[0] || null,
            reason: 'Highest rated available driver + smallest suitable vehicle',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get suggestions.' });
    }
});

module.exports = router;



// POST = usually used to create a NEW resource or trigger an action/process (login, assign, complete, create).
// PATCH = used to partially UPDATE AN EXISTING resource without replacing the whole record.

// req.params = values taken from dynamic parts of URL path like /shipments/:id -> req.params.id
// req.body = JSON data sent inside request body, usually used for form/input data.
// req.query = values after ? in URL used for filters/search like ?page=2&status=active