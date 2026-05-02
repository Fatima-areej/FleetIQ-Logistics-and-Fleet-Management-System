const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

const managerOnly = (req, res, next) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Manager access required.' });
    }
    next();
};

async function pickLeastLoadedManagerForWarehouse({ warehouseId }) {
    const result = await pool.query(
        `SELECT mwa.manager_id
         FROM manager_warehouse_assignments mwa
         JOIN users u ON u.user_id = mwa.manager_id
         LEFT JOIN maintenance_requests mr
           ON mr.assigned_manager_id = mwa.manager_id
          AND mr.status IN ('assigned','in_progress')
         WHERE mwa.warehouse_id = $1
           AND mwa.is_active = TRUE
           AND u.is_active = TRUE
           AND u.role = 'manager'
         GROUP BY mwa.manager_id, mwa.assigned_date
         ORDER BY COUNT(mr.request_id) ASC,
                  mwa.assigned_date ASC,
                  mwa.manager_id ASC
         LIMIT 1`,
        [warehouseId]
    );
    return result.rows[0]?.manager_id || null;
}

// POST /api/maintenance-requests/driver
// Driver requests maintenance for their assigned vehicle while on an active shipment.
router.post('/driver', auth, async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required.' });
    }
    const { vehicle_id, description, priority } = req.body || {};
    const vehicleId = parseInt(vehicle_id);
    if (!vehicleId) {
        return res.status(400).json({ error: 'vehicle_id is required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify vehicle is actively assigned to this driver
        const assignment = await client.query(
            `SELECT 1
             FROM driver_vehicle_assignments
             WHERE driver_id = $1 AND vehicle_id = $2 AND is_active = TRUE
             LIMIT 1`,
            [req.user.driver_id, vehicleId]
        );
        if (assignment.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'You can only request maintenance for your currently assigned vehicle.'
            });
        }

        // Enforce: exactly one active shipment for the driver and it uses this vehicle
        const ship = await client.query(
            `SELECT shipment_id, origin_warehouse_id
             FROM shipments
             WHERE driver_id = $1 AND org_id = $2
               AND status NOT IN ('delivered','cancelled')
               AND vehicle_id = $3`,
            [req.user.driver_id, req.user.org_id, vehicleId]
        );
        if (ship.rows.length !== 1) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Maintenance request requires exactly one active shipment using this vehicle.'
            });
        }

        const shipmentId = ship.rows[0].shipment_id;
        const warehouseId = ship.rows[0].origin_warehouse_id;

        const managerId = await pickLeastLoadedManagerForWarehouse({ warehouseId });
        if (!managerId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'No active manager is assigned to this warehouse.'
            });
        }

        // Mark vehicle as maintenance immediately
        await client.query(
            `UPDATE vehicles
             SET status = 'maintenance'
             WHERE vehicle_id = $1 AND org_id = $2`,
            [vehicleId, req.user.org_id]
        );

        const title = 'Driver maintenance request';

        const inserted = await client.query(
            `INSERT INTO maintenance_requests
                (org_id, vehicle_id, requested_by, source,
                 shipment_id, warehouse_id, assigned_manager_id,
                 status, priority, title, description)
             VALUES
                ($1, $2, $3, 'driver',
                 $4, $5, $6,
                 'assigned', $7, $8, $9)
             RETURNING request_id`,
            [
                req.user.org_id,
                vehicleId,
                req.user.user_id,
                shipmentId,
                warehouseId,
                managerId,
                priority || 'normal',
                title,
                description || null,
            ]
        );

        await client.query('COMMIT');
        res.status(201).json({
            message: 'Maintenance request created.',
            request_id: inserted.rows[0].request_id,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to create maintenance request.' });
    } finally {
        client.release();
    }
});

// POST /api/maintenance-requests/admin
// Admin schedules maintenance for a vehicle and assigns it to a manager.
router.post('/admin', auth, adminOnly, async (req, res) => {
    const { vehicle_id, assigned_manager_id, title, description, priority } = req.body || {};
    const vehicleId = parseInt(vehicle_id);
    const managerId = parseInt(assigned_manager_id);
    if (!vehicleId || !managerId) {
        return res.status(400).json({ error: 'vehicle_id and assigned_manager_id are required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const veh = await client.query(
            `SELECT vehicle_id FROM vehicles WHERE vehicle_id = $1 AND org_id = $2`,
            [vehicleId, req.user.org_id]
        );
        if (veh.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid vehicle for this organization.' });
        }

        const mgr = await client.query(
            `SELECT user_id FROM users
             WHERE user_id = $1 AND org_id = $2 AND role = 'manager' AND is_active = TRUE`,
            [managerId, req.user.org_id]
        );
        if (mgr.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid manager for this organization.' });
        }

        await client.query(
            `UPDATE vehicles SET status = 'maintenance'
             WHERE vehicle_id = $1 AND org_id = $2`,
            [vehicleId, req.user.org_id]
        );

        const inserted = await client.query(
            `INSERT INTO maintenance_requests
                (org_id, vehicle_id, requested_by, source,
                 assigned_manager_id, status, priority, title, description)
             VALUES
                ($1, $2, $3, 'admin',
                 $4, 'assigned', $5, $6, $7)
             RETURNING request_id`,
            [
                req.user.org_id,
                vehicleId,
                req.user.user_id,
                managerId,
                priority || 'normal',
                title || 'Admin maintenance request',
                description || null,
            ]
        );

        await client.query('COMMIT');
        res.status(201).json({
            message: 'Maintenance request created.',
            request_id: inserted.rows[0].request_id,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to create maintenance request.' });
    } finally {
        client.release();
    }
});

// GET /api/maintenance-requests/manager
router.get('/manager', auth, managerOnly, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT mr.*,
                    v.plate_number, v.vehicle_type,
                    u.name AS requested_by_name,
                    s.origin_warehouse_id,
                    w.name AS warehouse_name
             FROM maintenance_requests mr
             JOIN vehicles v ON v.vehicle_id = mr.vehicle_id
             LEFT JOIN users u ON u.user_id = mr.requested_by
             LEFT JOIN shipments s ON s.shipment_id = mr.shipment_id
             LEFT JOIN warehouses w ON w.warehouse_id = mr.warehouse_id
             WHERE mr.assigned_manager_id = $1
             ORDER BY mr.created_at DESC
             LIMIT 100`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch maintenance requests.' });
    }
});

// PATCH /api/maintenance-requests/:id/status — manager updates request status
router.patch('/:id/status', auth, managerOnly, async (req, res) => {
    const requestId = parseInt(req.params.id);
    const { status } = req.body || {};
    const next = String(status || '').trim();

    if (!requestId || !next) {
        return res.status(400).json({ error: 'status is required.' });
    }

    const allowed = new Set(['assigned', 'in_progress', 'resolved', 'cancelled']);
    if (!allowed.has(next)) {
        return res.status(400).json({ error: 'Invalid status.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Load request (and lock) so we can also update vehicle status on resolve
        const reqRow = await client.query(
            `SELECT request_id, org_id, vehicle_id, priority, description
             FROM maintenance_requests
             WHERE request_id = $1 AND assigned_manager_id = $2
             FOR UPDATE`,
            [requestId, req.user.user_id]
        );
        if (reqRow.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Request not found.' });
        }
        const { org_id: orgId, vehicle_id: vehicleId,
                priority, description: reqDescription } = reqRow.rows[0];

        const updated = await client.query(
            `UPDATE maintenance_requests
             SET status = $1::maintenance_request_status_enum,
                 resolved_at = CASE
                     WHEN $1::maintenance_request_status_enum = 'resolved'::maintenance_request_status_enum
                     THEN NOW()
                     ELSE NULL
                 END,
                 updated_at = NOW()
             WHERE request_id = $2 AND assigned_manager_id = $3
             RETURNING request_id, status, resolved_at, updated_at`,
            [next, requestId, req.user.user_id]
        );

        if (next === 'resolved') {
            await client.query(
                `UPDATE vehicles
                 SET status = 'available'
                 WHERE vehicle_id = $1 AND org_id = $2`,
                [vehicleId, orgId]
            );

            // Log completed maintenance into vehicle_maintenance for fleet analytics
            await client.query(
                `INSERT INTO vehicle_maintenance
                     (vehicle_id, maintenance_type, description, performed_by, performed_at)
                 VALUES ($1,
                     CASE $2
                         WHEN 'urgent' THEN 'emergency'
                         WHEN 'high'   THEN 'repair'
                         WHEN 'low'    THEN 'inspection'
                         ELSE               'routine'
                     END::maintenance_type_enum,
                     $3,
                     (SELECT name FROM users WHERE user_id = $4),
                     NOW())`,
                [vehicleId, priority, reqDescription, req.user.user_id]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Request updated.', request: updated.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to update request.' });
    } finally {
        client.release();
    }
});

// GET /api/maintenance-requests/driver — driver sees their active requests
router.get('/driver', auth, async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required.' });
    }
    try {
        const result = await pool.query(
            `SELECT request_id, vehicle_id, status, created_at, updated_at
             FROM maintenance_requests
             WHERE org_id = $1
               AND requested_by = $2
               AND status IN ('assigned','in_progress')
             ORDER BY created_at DESC
             LIMIT 100`,
            [req.user.org_id, req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch maintenance requests.' });
    }
});

// POST /api/maintenance-requests/:id/assign-replacement
router.post('/:id/assign-replacement', auth, managerOnly, async (req, res) => {
    const requestId = parseInt(req.params.id);
    const replacementId = parseInt(req.body?.replacement_vehicle_id);
    const note = req.body?.note ? String(req.body.note).trim() : null;
    if (!requestId || !replacementId) {
        return res.status(400).json({ error: 'replacement_vehicle_id is required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const reqRow = await client.query(
            `SELECT *
             FROM maintenance_requests
             WHERE request_id = $1 AND assigned_manager_id = $2`,
            [requestId, req.user.user_id]
        );
        if (reqRow.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Request not found.' });
        }
        const mr = reqRow.rows[0];
        if (!['assigned','in_progress'].includes(mr.status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Request is not active.' });
        }

        if (!mr.shipment_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Replacement assignment requires a shipment-linked request.' });
        }

        // Load shipment + driver and enforce it uses the reported vehicle
        const ship = await client.query(
            `SELECT shipment_id, driver_id, vehicle_id, org_id, status
             FROM shipments
             WHERE shipment_id = $1`,
            [mr.shipment_id]
        );
        if (ship.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Shipment not found for this request.' });
        }
        const s = ship.rows[0];
        if (s.org_id !== mr.org_id || s.vehicle_id !== mr.vehicle_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Shipment does not match the reported vehicle.' });
        }
        if (['delivered','cancelled'].includes(s.status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Shipment is already finished.' });
        }

        // Enforce: driver has exactly ONE active vehicle assignment and it matches the reported vehicle
        const activeAssignments = await client.query(
            `SELECT vehicle_id
             FROM driver_vehicle_assignments
             WHERE driver_id = $1 AND is_active = TRUE`,
            [s.driver_id]
        );
        if (activeAssignments.rows.length !== 1 || activeAssignments.rows[0].vehicle_id !== mr.vehicle_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Driver must have exactly one active vehicle assignment matching the reported vehicle.'
            });
        }

        // Replacement vehicle must be available and in same org
        const repl = await client.query(
            `SELECT vehicle_id, status
             FROM vehicles
             WHERE vehicle_id = $1 AND org_id = $2`,
            [replacementId, mr.org_id]
        );
        if (repl.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid replacement vehicle for this organization.' });
        }
        if (repl.rows[0].status !== 'available') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Replacement vehicle must be available.' });
        }

        // Deactivate old assignment + create new assignment
        await client.query(
            `UPDATE driver_vehicle_assignments
             SET is_active = FALSE, end_date = CURRENT_DATE
             WHERE driver_id = $1 AND vehicle_id = $2 AND is_active = TRUE`,
            [s.driver_id, mr.vehicle_id]
        );
        await client.query(
            `INSERT INTO driver_vehicle_assignments (driver_id, vehicle_id, assigned_at, is_active)
             VALUES ($1, $2, NOW(), TRUE)`,
            [s.driver_id, replacementId]
        );

        // Update vehicle statuses
        await client.query(
            `UPDATE vehicles SET status = 'in_use'
             WHERE vehicle_id = $1 AND org_id = $2`,
            [replacementId, mr.org_id]
        );

        // Move shipment to replacement vehicle
        await client.query(
            `UPDATE shipments
             SET vehicle_id = $1
             WHERE shipment_id = $2 AND org_id = $3`,
            [replacementId, s.shipment_id, mr.org_id]
        );

        // Record replacement in description (no schema change). Do NOT change status —
        // manager will explicitly control status via Start/Resolve/Cancel.
        const replPlate = await client.query(
            `SELECT plate_number FROM vehicles WHERE vehicle_id = $1`,
            [replacementId]
        );
        const replPlateNumber = replPlate.rows[0]?.plate_number || `#${replacementId}`;

        const autoText = `Replacement assigned: ${replPlateNumber} (vehicle_id=${replacementId})`;
        const appendText = note ? `${autoText}\nManager note: ${note}` : autoText;
        await client.query(
            `UPDATE maintenance_requests
             SET resolved_at = NULL,
                 updated_at = NOW(),
                 description = TRIM(BOTH E'\n' FROM
                     COALESCE(description, '') ||
                     CASE WHEN COALESCE(description, '') = '' THEN '' ELSE E'\n' END ||
                     $2
                 )
             WHERE request_id = $1`,
            [requestId, appendText]
        );

        await client.query('COMMIT');
        res.json({ message: 'Replacement assigned.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to assign replacement.' });
    } finally {
        client.release();
    }
});

module.exports = router;

