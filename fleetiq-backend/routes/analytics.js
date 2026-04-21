/*

summarizing database into meaningful insights

*/


const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// GET /api/analytics/dashboard — main dashboard stats
router.get('/dashboard', auth, async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [
            totals, statusBreakdown, topDrivers,
            fleetStatus, warehouseLoads, recentDelayed
            // runs queries in parallel (using Promise)
        ] = await Promise.all([                 

            // overall counts and averages
            pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'delivered')
                        AS total_delivered,
                    COUNT(*) FILTER (WHERE status NOT IN ('delivered','cancelled'))
                        AS active_shipments,
                    COUNT(*) FILTER (WHERE status = 'cancelled')
                        AS total_cancelled,
                    COUNT(*) FILTER (WHERE estimated_delivery < NOW()
                        AND status NOT IN ('delivered','cancelled'))
                        AS delayed_count,
                    ROUND(AVG(
                        EXTRACT(EPOCH FROM (delivered_at - created_at))/3600
                    ) FILTER (WHERE status = 'delivered'), 2)
                        AS avg_delivery_hours,
                    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)
                        AS shipments_today
                FROM shipments WHERE org_id = $1`, [org_id]),

            // shipments by status
            pool.query(`
                SELECT status, COUNT(*) AS count
                FROM shipments WHERE org_id = $1
                GROUP BY status ORDER BY count DESC`, [org_id]),

            // top 5 drivers
            pool.query(`
                SELECT driver_name, completed_deliveries,
                       on_time_deliveries, rating
                FROM driver_performance_view
                WHERE org_id = $1
                ORDER BY completed_deliveries DESC
                LIMIT 5`, [org_id]),

            // fleet status breakdown
            pool.query(`
                SELECT status, COUNT(*) AS count
                FROM vehicles WHERE org_id = $1
                GROUP BY status`, [org_id]),

            // warehouse load percentages
            pool.query(`
                SELECT warehouse_name, city,
                       load_percentage, current_load, capacity_units
                FROM warehouse_throughput_view
                WHERE org_id = $1
                ORDER BY load_percentage DESC`, [org_id]),

            // recent delayed shipments
            pool.query(`
                SELECT * FROM delayed_shipments_view
                WHERE org_id = $1
                LIMIT 5`, [org_id])
        ]);

        res.json({
            totals:          totals.rows[0],
            statusBreakdown: statusBreakdown.rows,
            topDrivers:      topDrivers.rows,
            fleetStatus:     fleetStatus.rows,
            warehouseLoads:  warehouseLoads.rows,
            recentDelayed:   recentDelayed.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dashboard data.' });
    }
});

// GET /api/analytics/driver/:id — individual driver stats
router.get('/driver/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM driver_performance_view WHERE driver_id = $1`,
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch driver analytics.' });
    }
});

// GET /api/analytics/monthly — shipments per month for chart
router.get('/monthly', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'delivered')  AS delivered,
                COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled
            FROM shipments
            WHERE org_id = $1
              AND created_at >= NOW() - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch monthly data.' });
    }
});

// GET /api/analytics/drivers — full driver analytics
router.get('/drivers', auth, async (req, res) => {
    try {
        const [perfRes, monthlyRes] = await Promise.all([
            pool.query(
                `SELECT * FROM driver_performance_view
                 WHERE org_id = $1
                 ORDER BY completed_deliveries DESC`,
                [req.user.org_id]
            ),
            pool.query(
                `SELECT
                    u.name AS driver_name,
                    d.driver_id,
                    COUNT(*) FILTER (WHERE s.status = 'delivered'
                        AND DATE_TRUNC('month', s.delivered_at) = DATE_TRUNC('month', NOW()))
                        AS this_month,
                    COUNT(*) FILTER (WHERE s.status = 'delivered'
                        AND DATE_TRUNC('month', s.delivered_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month'))
                        AS last_month
                 FROM drivers d
                 JOIN users u ON u.user_id = d.user_id
                 LEFT JOIN shipments s ON s.driver_id = d.driver_id
                 WHERE u.org_id = $1
                 GROUP BY d.driver_id, u.name
                 ORDER BY this_month DESC`,
                [req.user.org_id]
            ),
        ]);
        res.json({
            performance:  perfRes.rows,
            monthlyStats: monthlyRes.rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch driver analytics.' });
    }
});

// GET /api/analytics/fleet — vehicle utilization analytics
router.get('/fleet', auth, async (req, res) => {
    try {
        const [utilizationRes, maintenanceRes] = await Promise.all([
            pool.query(
                `SELECT * FROM fleet_utilization_view
                 WHERE org_id = $1
                 ORDER BY total_trips DESC`,
                [req.user.org_id]
            ),
            pool.query(
                `SELECT
                    vehicle_type,
                    COUNT(*) AS count,
                    COALESCE(SUM(cost), 0) AS total_cost,
                    COUNT(*) FILTER (WHERE maintenance_type = 'emergency') AS emergencies
                 FROM vehicle_maintenance vm
                 JOIN vehicles v ON v.vehicle_id = vm.vehicle_id
                 WHERE v.org_id = $1
                 GROUP BY vehicle_type`,
                [req.user.org_id]
            ),
        ]);
        res.json({
            utilization:  utilizationRes.rows,
            maintenance:  maintenanceRes.rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch fleet analytics.' });
    }
});

// GET /api/analytics/warehouses — warehouse analytics
router.get('/warehouses', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM warehouse_throughput_view
             WHERE org_id = $1
             ORDER BY load_percentage DESC`,
            [req.user.org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch warehouse analytics.' });
    }
});

module.exports = router;