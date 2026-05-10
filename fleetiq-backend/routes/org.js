const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');
const bcrypt  = require('bcryptjs');

// middleware — admin only
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

// GET /api/org — get org profile
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM organizations WHERE org_id = $1`,
            [req.user.org_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch organization.' });
    }
});

// PATCH /api/org — update org profile
router.patch('/', auth, adminOnly, async (req, res) => {
    const { name, industry, contact_email, phone } = req.body;
    try {
        const result = await pool.query(
            `UPDATE organizations
             SET name          = COALESCE($1, name),
                 industry      = COALESCE($2, industry),
                 contact_email = COALESCE($3, contact_email),
                 phone         = COALESCE($4, phone)
             WHERE org_id = $5
             RETURNING *`,
            [name, industry, contact_email, phone, req.user.org_id]
        );
        res.json({ message: 'Organization updated.', org: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update organization.' });
    }
});

// USER MANAGEMENT 

// GET /api/org/users — all users in org
router.get('/users', auth, adminOnly, async (req, res) => {
    const { role } = req.query; // optional filter ?role=driver
    try {
        const result = await pool.query(
            `SELECT u.user_id, u.name, u.email, u.role,
                    u.is_active, u.last_login, u.created_at,
                    d.driver_id, d.rating, d.total_deliveries,
                    d.availability_status, d.license_number
             FROM users u
             LEFT JOIN drivers d ON d.user_id = u.user_id
             WHERE u.org_id = $1
               AND ($2::text IS NULL OR u.role = $2::role_enum)
             ORDER BY u.role, u.name`,
            [req.user.org_id, role || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// POST /api/org/users - create manager or driver

router.post('/users', auth, adminOnly, async (req, res) => {
    const { name, email, password, role,
            license_number, experience_years } = req.body;

    if (!['manager', 'driver'].includes(role)) {
        return res.status(400).json({ error: 'Can only create manager or driver accounts.' });
    }

    const emailNorm = String(email || '').trim().toLowerCase();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // check email not taken (case-insensitive)
        const existing = await client.query(
            `SELECT user_id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
            [emailNorm]
        );
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const password_hash = await bcrypt.hash(password || 'password123', 10);

        // insert user
        const userResult = await client.query(
            `INSERT INTO users (org_id, name, email, password_hash, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.user.org_id, name, emailNorm, password_hash, role]
        );
        const newUser = userResult.rows[0];

        // if driver, create drivers row too
        if (role === 'driver') {
            await client.query(
                `INSERT INTO drivers
                    (user_id, license_number, experience_years)
                 VALUES ($1, $2, $3)`,
                [newUser.user_id,
                 license_number || 'PENDING',
                 experience_years || 0]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({
            message: `${role} created successfully.`,
            user: newUser
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to create user.' });
    } finally {
        client.release();
    }
});

// PATCH /api/org/users/:id/deactivate

router.patch('/users/:id/deactivate', auth, adminOnly, async (req, res) => {
    try {
        await pool.query(
            `UPDATE users SET is_active = FALSE
             WHERE user_id = $1 AND org_id = $2`,
            [req.params.id, req.user.org_id]
        );
        res.json({ message: 'User deactivated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to deactivate user.' });
    }
});

// PATCH /api/org/users/:id/reactivate

router.patch('/users/:id/reactivate', auth, adminOnly, async (req, res) => {
    try {
        await pool.query(
            `UPDATE users SET is_active = TRUE
             WHERE user_id = $1 AND org_id = $2`,
            [req.params.id, req.user.org_id]
        );
        res.json({ message: 'User reactivated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reactivate user.' });
    }
});

// PATCH /api/org/users/:id — update user details

router.patch('/users/:id', auth, adminOnly, async (req, res) => {
    const { name, email } = req.body;
    try {
        const result = await pool.query(
            `UPDATE users
             SET name  = COALESCE($1, name),
                 email = COALESCE($2, email)
             WHERE user_id = $3 AND org_id = $4
             RETURNING user_id, name, email, role`,
            [name, email, req.params.id, req.user.org_id]
        );
        res.json({ message: 'User updated.', user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

module.exports = router;