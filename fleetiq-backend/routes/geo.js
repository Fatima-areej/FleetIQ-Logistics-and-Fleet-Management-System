const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// GET /api/geo/map-data — all warehouses + vehicles for map

// This endpoint aggregates geospatial data for warehouses, vehicles, and active shipments.
// using Promise.all to run the three queries in parallel for better performance.


router.get('/map-data', auth, async (req, res) => {
    try {
        const [warehouseRes, vehicleRes, shipmentRes] = await Promise.all([
            pool.query(
                `SELECT warehouse_id, name, city, address,
                        capacity_units, current_load,
                        ST_Y(location::geometry) AS latitude,
                        ST_X(location::geometry) AS longitude
                 FROM warehouses
                 WHERE org_id = $1 AND location IS NOT NULL`,
                [req.user.org_id]
            ),
            pool.query(
                `SELECT vehicle_id, plate_number, vehicle_type, status,
                        ST_Y(current_location::geometry) AS latitude,
                        ST_X(current_location::geometry) AS longitude
                 FROM vehicles
                 WHERE org_id = $1 AND current_location IS NOT NULL`,
                [req.user.org_id]
            ),
            pool.query(
                `SELECT s.shipment_id, s.status, s.priority,
                        s.destination_address,
                        ST_Y(s.destination_location::geometry) AS latitude,
                        ST_X(s.destination_location::geometry) AS longitude,
                        u.name AS driver_name
                 FROM shipments s
                 LEFT JOIN drivers d ON d.driver_id = s.driver_id
                 LEFT JOIN users u   ON u.user_id   = d.user_id
                 WHERE s.org_id = $1
                   AND s.status NOT IN ('delivered','cancelled')
                   AND s.destination_location IS NOT NULL`,
                [req.user.org_id]
            )
        ]);

        res.json({
            warehouses: warehouseRes.rows,
            vehicles:   vehicleRes.rows,
            shipments:  shipmentRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch map data.' });
    }
});

module.exports = router;