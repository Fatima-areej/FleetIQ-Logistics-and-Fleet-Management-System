const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { withRLSClient, setRLSContext } = pool;
const auth    = require('../middleware/auth');

// Valid shipment_status_enum values — used to validate manual status updates
const VALID_STATUSES = new Set([
    'created', 'assigned', 'in_transit',
    'at_warehouse', 'out_for_delivery', 'delivered', 'cancelled',
]);

async function managerCanAccessWarehouse(managerUserId, warehouseId) {
    const result = await pool.query(
        `SELECT 1
         FROM manager_warehouse_assignments
         WHERE manager_id = $1 AND warehouse_id = $2 AND is_active = TRUE
         LIMIT 1`,
        [managerUserId, warehouseId]
    );
    return result.rows.length > 0;
}

async function managerCanAccessShipment(managerUserId, shipmentId, orgId) {
    const result = await pool.query(
        `SELECT 1
         FROM shipments s
         JOIN manager_warehouse_assignments mwa
           ON mwa.warehouse_id = s.origin_warehouse_id
          AND mwa.manager_id = $1
          AND mwa.is_active = TRUE
         WHERE s.shipment_id = $2 AND s.org_id = $3
         LIMIT 1`,
        [managerUserId, shipmentId, orgId]
    );
    return result.rows.length > 0;
}

// GET /api/shipments — active shipments, role-scoped
router.get('/', auth, async (req, res) => {
    try {
        let query, params;

        if (req.user.role === 'driver') {
            // Use the view — now includes delivery_mode and transfer_warehouse columns
            query = `
                SELECT *
                FROM active_shipments_view
                WHERE org_id = $1
                  AND driver_id = $2
                ORDER BY created_at DESC`;
            params = [req.user.org_id, req.user.driver_id];
        } else if (req.user.role === 'manager') {
            query = `
                SELECT *
                FROM active_shipments_view
                WHERE org_id = $1
                  AND origin_warehouse_id IN (
                      SELECT warehouse_id
                      FROM manager_warehouse_assignments
                      WHERE manager_id = $2 AND is_active = TRUE
                  )
                ORDER BY created_at DESC`;
            params = [req.user.org_id, req.user.user_id];
        } else {
            query = `
                SELECT *
                FROM active_shipments_view
                WHERE org_id = $1
                ORDER BY created_at DESC`;
            params = [req.user.org_id];
        }

        const rows = await withRLSClient(
            req.user.user_id, req.user.role,
            client => client.query(query, params).then(r => r.rows)
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch shipments.' });
    }
});

// GET /api/shipments/all — includes delivered and cancelled
router.get('/all', auth, async (req, res) => {
    try {
        let query, params;

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
        } else if (req.user.role === 'manager') {
            query = `
                SELECT s.*, u.name AS driver_name, v.plate_number,
                       w.name AS origin_warehouse
                FROM shipments s
                LEFT JOIN drivers d    ON d.driver_id    = s.driver_id
                LEFT JOIN users u      ON u.user_id      = d.user_id
                LEFT JOIN vehicles v   ON v.vehicle_id   = s.vehicle_id
                LEFT JOIN warehouses w ON w.warehouse_id = s.origin_warehouse_id
                WHERE s.org_id = $1
                  AND s.origin_warehouse_id IN (
                      SELECT warehouse_id
                      FROM manager_warehouse_assignments
                      WHERE manager_id = $2 AND is_active = TRUE
                  )
                ORDER BY s.created_at DESC`;
            params = [req.user.org_id, req.user.user_id];
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

        const rows = await withRLSClient(
            req.user.user_id, req.user.role,
            client => client.query(query, params).then(r => r.rows)
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch shipments.' });
    }
});

// GET /api/shipments/delayed
router.get('/delayed', auth, async (req, res) => {
    try {
        let query, params;

        if (req.user.role === 'manager') {
            query = `
                SELECT *
                FROM delayed_shipments_view
                WHERE org_id = $1
                  AND origin_warehouse_id IN (
                      SELECT warehouse_id
                      FROM manager_warehouse_assignments
                      WHERE manager_id = $2 AND is_active = TRUE
                  )`;
            params = [req.user.org_id, req.user.user_id];
        } else {
            query = `SELECT * FROM delayed_shipments_view WHERE org_id = $1`;
            params = [req.user.org_id];
        }

        const rows = await withRLSClient(
            req.user.user_id, req.user.role,
            client => client.query(query, params).then(r => r.rows)
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch delayed shipments.' });
    }
});

// GET /api/shipments/:id — single shipment with history, items, and stops
// Runs the four sub-queries in parallel inside one RLS-context transaction.
router.get('/:id', auth, async (req, res) => {
    try {
        const data = await withRLSClient(
            req.user.user_id, req.user.role,
            async client => {
                const [shipmentRes, historyRes, itemsRes, stopsRes] = await Promise.all([
                    client.query(
                        `SELECT s.*, u.name AS driver_name, v.plate_number,
                                v.vehicle_type, w.name AS origin_warehouse,
                                w.city AS origin_city,
                                tw.name AS transfer_warehouse,
                                tw.city AS transfer_city
                         FROM shipments s
                         LEFT JOIN drivers d    ON d.driver_id    = s.driver_id
                         LEFT JOIN users u      ON u.user_id      = d.user_id
                         LEFT JOIN vehicles v   ON v.vehicle_id   = s.vehicle_id
                         LEFT JOIN warehouses w  ON w.warehouse_id  = s.origin_warehouse_id
                         LEFT JOIN warehouses tw ON tw.warehouse_id = s.transfer_warehouse_id
                         WHERE s.shipment_id = $1 AND s.org_id = $2`,
                        [req.params.id, req.user.org_id]
                    ),
                    client.query(
                        `SELECT ssh.*, u.name AS updated_by_name
                         FROM shipment_status_history ssh
                         LEFT JOIN users u ON u.user_id = ssh.updated_by
                         WHERE ssh.shipment_id = $1
                         ORDER BY ssh.changed_at ASC`,
                        [req.params.id]
                    ),
                    client.query(
                        `SELECT * FROM shipment_items WHERE shipment_id = $1`,
                        [req.params.id]
                    ),
                    client.query(
                        `SELECT ws.*, w.name AS warehouse_name, w.city
                         FROM warehouse_shipments ws
                         JOIN warehouses w ON w.warehouse_id = ws.warehouse_id
                         WHERE ws.shipment_id = $1
                         ORDER BY ws.arrival_time ASC`,
                        [req.params.id]
                    ),
                ]);
                return {
                    shipment: shipmentRes.rows,
                    history:  historyRes.rows,
                    items:    itemsRes.rows,
                    stops:    stopsRes.rows,
                };
            }
        );

        if (data.shipment.length === 0) {
            return res.status(404).json({ error: 'Shipment not found.' });
        }
        res.json({
            shipment: data.shipment[0],
            history:  data.history,
            items:    data.items,
            stops:    data.stops,
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

    if (req.user.role === 'driver') {
        return res.status(403).json({ error: 'Drivers cannot create shipments.' });
    }
    if (!origin_warehouse_id) {
        return res.status(400).json({ error: 'Origin warehouse is required.' });
    }
    if (!destination_address) {
        return res.status(400).json({ error: 'Destination address is required.' });
    }

    if (req.user.role === 'manager') {
        const ok = await managerCanAccessWarehouse(req.user.user_id, origin_warehouse_id);
        if (!ok) {
            return res.status(403).json({
                error: 'You are not assigned to the selected origin warehouse.'
            });
        }
    }

    // Convert empty strings to null so ST_MakePoint is skipped when not provided
    const lng = destination_lng !== '' && destination_lng != null ? parseFloat(destination_lng) : null;
    const lat = destination_lat !== '' && destination_lat != null ? parseFloat(destination_lat) : null;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await setRLSContext(client, req.user.user_id, req.user.role);

        const result = await client.query(
            `INSERT INTO shipments
                (org_id, origin_warehouse_id, destination_address,
                 destination_location, weight_kg, priority, estimated_delivery)
             VALUES ($1, $2, $3,
                 CASE WHEN $4::float8 IS NOT NULL AND $5::float8 IS NOT NULL
                      THEN ST_MakePoint($4::float8, $5::float8)::geography
                      ELSE NULL
                 END,
                 $6, $7, $8)
             RETURNING *`,
            [req.user.org_id, origin_warehouse_id, destination_address,
             lng, lat,
             weight_kg !== '' && weight_kg != null ? parseFloat(weight_kg) : null,
             priority || 'normal',
             estimated_delivery || null]
        );

        const newShipment = result.rows[0];

        // Batch-insert all items in a single query using UNNEST — avoids N round-trips
        if (items && items.length > 0) {
            await client.query(
                `INSERT INTO shipment_items
                    (shipment_id, item_name, quantity, weight, category)
                 SELECT $1,
                        UNNEST($2::TEXT[]),
                        UNNEST($3::INT[]),
                        UNNEST($4::NUMERIC[]),
                        UNNEST($5::TEXT[])`,
                [
                    newShipment.shipment_id,
                    items.map(i => i.item_name || null),
                    items.map(i => i.quantity !== '' && i.quantity != null ? parseInt(i.quantity, 10) : null),
                    items.map(i => i.weight   !== '' && i.weight   != null ? parseFloat(i.weight)    : null),
                    items.map(i => i.category || null),
                ]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({
            message:  'Shipment created successfully.',
            shipment: newShipment,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to create shipment. All changes rolled back.' });
    } finally {
        client.release();
    }
});

// POST /api/shipments/:id/assign — assign driver and vehicle
router.post('/:id/assign', auth, async (req, res) => {
    const { driver_id, vehicle_id, delivery_mode, transfer_warehouse_id } = req.body;
    if (req.user.role === 'driver') {
        return res.status(403).json({ error: 'Drivers cannot assign shipments.' });
    }
    if (req.user.role === 'manager') {
        const ok = await managerCanAccessShipment(
            req.user.user_id, req.params.id, req.user.org_id
        );
        if (!ok) {
            return res.status(403).json({
                error: 'You cannot assign shipments outside your warehouses.'
            });
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await setRLSContext(client, req.user.user_id, req.user.role);

        const shipRow = await client.query(
            `SELECT origin_warehouse_id
             FROM shipments
             WHERE shipment_id = $1 AND org_id = $2
             FOR UPDATE`,
            [req.params.id, req.user.org_id]
        );
        if (shipRow.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Shipment not found.' });
        }
        const originWh = shipRow.rows[0].origin_warehouse_id;

        const mode = delivery_mode === 'via_warehouse' ? 'via_warehouse' : 'direct';
        const transferWh = mode === 'via_warehouse' ? transfer_warehouse_id : null;
        if (mode === 'via_warehouse' && !transferWh) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'transfer_warehouse_id is required for via_warehouse.' });
        }

        if (mode === 'via_warehouse') {
            const twInt = parseInt(transferWh, 10);
            if (Number.isNaN(twInt)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Invalid transfer_warehouse_id.' });
            }
            if (Number(originWh) === twInt) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Transfer warehouse must be different from the origin warehouse.',
                });
            }
            const wh = await client.query(
                `SELECT warehouse_id FROM warehouses WHERE warehouse_id = $1 AND org_id = $2`,
                [twInt, req.user.org_id]
            );
            if (wh.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Invalid transfer warehouse for this organization.' });
            }
        }

        await client.query(
            `CALL assign_shipment($1, $2, $3)`,
            [req.params.id, driver_id, vehicle_id]
        );

        await client.query(
            `UPDATE shipments
             SET delivery_mode = $1,
                 transfer_warehouse_id = $2
             WHERE shipment_id = $3 AND org_id = $4`,
            [mode, transferWh ? parseInt(transferWh, 10) : null, req.params.id, req.user.org_id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Shipment assigned successfully.' });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/shipments/:id/complete — mark as delivered (admin/manager only)
router.post('/:id/complete', auth, async (req, res) => {
    if (req.user.role === 'driver') {
        return res.status(403).json({ error: 'Drivers cannot complete deliveries here.' });
    }
    if (req.user.role === 'manager') {
        const ok = await managerCanAccessShipment(
            req.user.user_id, req.params.id, req.user.org_id
        );
        if (!ok) {
            return res.status(403).json({
                error: 'You cannot complete shipments outside your warehouses.'
            });
        }
    }
    try {
        await withRLSClient(
            req.user.user_id, req.user.role,
            client => client.query(`CALL complete_delivery($1)`, [req.params.id])
        );
        res.json({ message: 'Shipment marked as delivered.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/shipments/:id/driver-progress — driver-controlled status progression
router.post('/:id/driver-progress', auth, async (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required.' });
    }

    const { next_status } = req.body;
    const allowedDirect = {
        assigned:        'out_for_delivery',
        out_for_delivery: 'delivered',
    };
    const allowedViaWarehouse = {
        assigned:        'in_transit',
        in_transit:      'at_warehouse',
        at_warehouse:    'out_for_delivery',
        out_for_delivery: 'delivered',
    };

    try {
        const result = await withRLSClient(
            req.user.user_id, req.user.role,
            async client => {
                const shipment = await client.query(
                    `SELECT shipment_id, status, vehicle_id, delivery_mode, transfer_warehouse_id
                     FROM shipments
                     WHERE shipment_id = $1 AND driver_id = $2 AND org_id = $3`,
                    [req.params.id, req.user.driver_id, req.user.org_id]
                );
                if (shipment.rows.length === 0) return { notFound: true };

                const current = shipment.rows[0].status;
                const mode    = shipment.rows[0].delivery_mode || 'direct';
                const flow    = mode === 'via_warehouse' ? allowedViaWarehouse : allowedDirect;
                const expectedNext = flow[current];

                if (!expectedNext) return { badStatus: current };
                if (next_status !== expectedNext) return { wrongNext: expectedNext };
                if (!shipment.rows[0].vehicle_id) return { noVehicle: true };

                if (next_status === 'delivered') {
                    await client.query(`CALL complete_delivery($1)`, [req.params.id]);
                    return { message: 'Shipment marked as delivered.' };
                }

                if (next_status === 'at_warehouse') {
                    const tw = shipment.rows[0].transfer_warehouse_id;
                    if (!tw) return { noTransferWh: true };
                    await client.query(`CALL transfer_to_warehouse($1, $2)`, [req.params.id, tw]);
                    return { message: 'Shipment reached warehouse.' };
                }

                await client.query(
                    `UPDATE shipments SET status = $1
                     WHERE shipment_id = $2 AND driver_id = $3 AND org_id = $4`,
                    [next_status, req.params.id, req.user.driver_id, req.user.org_id]
                );
                return { message: `Shipment progressed to ${next_status}.` };
            }
        );

        if (result.notFound)    return res.status(404).json({ error: 'Shipment not found.' });
        if (result.badStatus)   return res.status(400).json({ error: `Cannot progress from status '${result.badStatus}'.` });
        if (result.wrongNext)   return res.status(400).json({ error: `Next status must be '${result.wrongNext}'.` });
        if (result.noVehicle)   return res.status(400).json({ error: 'Shipment has no assigned vehicle.' });
        if (result.noTransferWh) return res.status(400).json({ error: 'No transfer warehouse set for this shipment.' });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update shipment status.' });
    }
});

// PATCH /api/shipments/:id/status — manual status override (admin only)
router.patch('/:id/status', auth, async (req, res) => {
    const { status } = req.body;
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    if (!status || !VALID_STATUSES.has(status)) {
        return res.status(400).json({
            error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}.`,
        });
    }
    try {
        await withRLSClient(
            req.user.user_id, req.user.role,
            client => client.query(
                `UPDATE shipments SET status = $1 WHERE shipment_id = $2 AND org_id = $3`,
                [status, req.params.id, req.user.org_id]
            )
        );
        res.json({ message: 'Status updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update status.' });
    }
});

// PATCH /api/shipments/:id/cancel
router.patch('/:id/cancel', auth, async (req, res) => {
    if (req.user.role === 'driver') {
        return res.status(403).json({ error: 'Drivers cannot cancel shipments.' });
    }
    if (req.user.role === 'manager') {
        const ok = await managerCanAccessShipment(
            req.user.user_id, req.params.id, req.user.org_id
        );
        if (!ok) {
            return res.status(403).json({
                error: 'You cannot cancel shipments outside your warehouses.'
            });
        }
    }
    try {
        const result = await withRLSClient(
            req.user.user_id, req.user.role,
            async client => {
                // Lock the row and read current status in one step
                const existing = await client.query(
                    `SELECT status FROM shipments
                     WHERE shipment_id = $1 AND org_id = $2
                     FOR UPDATE`,
                    [req.params.id, req.user.org_id]
                );
                if (existing.rows.length === 0) return { notFound: true };

                const currentStatus = existing.rows[0].status;
                if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
                    return { conflict: true, status: currentStatus };
                }

                await client.query(
                    `UPDATE shipments SET status = 'cancelled'
                     WHERE shipment_id = $1 AND org_id = $2`,
                    [req.params.id, req.user.org_id]
                );
                return { ok: true };
            }
        );

        if (result.notFound) return res.status(404).json({ error: 'Shipment not found.' });
        if (result.conflict) return res.status(409).json({
            error: `Cannot cancel a shipment with status '${result.status}'.`,
        });
        res.json({ message: 'Shipment cancelled.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to cancel shipment.' });
    }
});

// PATCH /api/shipments/:id/transfer-warehouse — set transfer destination (manager only)
router.patch('/:id/transfer-warehouse', auth, async (req, res) => {
    if (req.user.role === 'driver') {
        return res.status(403).json({ error: 'Drivers cannot update transfer warehouse.' });
    }
    if (req.user.role === 'admin') {
        return res.status(403).json({ error: 'Only managers can set transfer warehouse from this endpoint.' });
    }

    const { transfer_warehouse_id } = req.body || {};
    const twId = parseInt(transfer_warehouse_id);
    if (!twId) {
        return res.status(400).json({ error: 'transfer_warehouse_id is required.' });
    }

    const ok = await managerCanAccessShipment(
        req.user.user_id, req.params.id, req.user.org_id
    );
    if (!ok) {
        return res.status(403).json({ error: 'You cannot update this shipment.' });
    }

    const whOk = await managerCanAccessWarehouse(req.user.user_id, twId);
    if (!whOk) {
        return res.status(403).json({ error: 'You are not assigned to the selected transfer warehouse.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await setRLSContext(client, req.user.user_id, req.user.role);

        const ship = await client.query(
            `SELECT shipment_id, status, delivery_mode, transfer_warehouse_id, origin_warehouse_id, org_id
             FROM shipments
             WHERE shipment_id = $1 AND org_id = $2
             FOR UPDATE`,
            [req.params.id, req.user.org_id]
        );
        if (ship.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Shipment not found.' });
        }
        const s = ship.rows[0];

        if (s.delivery_mode !== 'via_warehouse') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Transfer warehouse can only be set for via_warehouse shipments.' });
        }
        if (s.transfer_warehouse_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Transfer warehouse is already set.' });
        }
        if (!['assigned', 'in_transit', 'at_warehouse'].includes(s.status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot set transfer warehouse for this shipment status.' });
        }
        if (Number(s.origin_warehouse_id) === twId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Transfer warehouse must be different from the origin warehouse.',
            });
        }

        const wh = await client.query(
            `SELECT warehouse_id FROM warehouses WHERE warehouse_id = $1 AND org_id = $2`,
            [twId, req.user.org_id]
        );
        if (wh.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid warehouse for this organization.' });
        }

        await client.query(
            `UPDATE shipments SET transfer_warehouse_id = $1
             WHERE shipment_id = $2 AND org_id = $3`,
            [twId, req.params.id, req.user.org_id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Transfer warehouse updated.' });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error(err);
        res.status(500).json({ error: 'Failed to update transfer warehouse.' });
    } finally {
        client.release();
    }
});

// POST /api/shipments/:id/transfer — execute warehouse transfer
router.post('/:id/transfer', auth, async (req, res) => {
    const { warehouse_id } = req.body;
    if (req.user.role === 'driver') {
        return res.status(403).json({ error: 'Drivers cannot transfer shipments.' });
    }
    if (req.user.role === 'manager') {
        const ok = await managerCanAccessShipment(
            req.user.user_id, req.params.id, req.user.org_id
        );
        if (!ok) {
            return res.status(403).json({
                error: 'You cannot transfer shipments outside your warehouses.'
            });
        }
    }
    try {
        await withRLSClient(
            req.user.user_id, req.user.role,
            client => client.query(`CALL transfer_to_warehouse($1, $2)`, [req.params.id, warehouse_id])
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
        if (req.user.role === 'manager') {
            const ok = await managerCanAccessShipment(
                req.user.user_id, req.params.id, req.user.org_id
            );
            if (!ok) {
                return res.status(403).json({ error: 'You cannot access this shipment.' });
            }
        }

        const [shipmentRes, bestDriverRes, bestVehicleRes] = await Promise.all([
            pool.query(
                `SELECT s.weight_kg
                 FROM shipments s
                 WHERE s.shipment_id = $1 AND s.org_id = $2`,
                [req.params.id, req.user.org_id]
            ),
            pool.query(
                `SELECT d.driver_id, u.name, d.rating, d.total_deliveries, d.experience_years
                 FROM drivers d
                 JOIN users u ON u.user_id = d.user_id
                 WHERE u.org_id = $1
                   AND d.availability_status = 'available'
                   AND NOT EXISTS (
                       SELECT 1 FROM shipments s
                       WHERE s.driver_id = d.driver_id
                         AND s.status NOT IN ('delivered', 'cancelled')
                   )
                 ORDER BY d.rating DESC, d.total_deliveries ASC
                 LIMIT 1`,
                [req.user.org_id]
            ),
            // vehicle weight check requires the shipment weight — fetch shipment first,
            // but we can still parallelize because we'll filter in JS if shipment is missing
            pool.query(
                `SELECT vehicle_id, plate_number, vehicle_type, capacity_kg
                 FROM vehicles
                 WHERE org_id = $1 AND status = 'available'
                 ORDER BY capacity_kg ASC`,
                [req.user.org_id]
            ),
        ]);

        if (shipmentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found.' });
        }

        const weightKg = shipmentRes.rows[0].weight_kg || 0;
        const bestVehicle = bestVehicleRes.rows.find(v => v.capacity_kg >= weightKg) || null;

        res.json({
            suggested_driver:  bestDriverRes.rows[0] || null,
            suggested_vehicle: bestVehicle,
            reason: 'Highest rated available driver + smallest suitable vehicle',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get suggestions.' });
    }
});

module.exports = router;
