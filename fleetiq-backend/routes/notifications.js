const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 30`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT COUNT(*) AS unread
             FROM notifications
             WHERE user_id = $1 AND is_read = FALSE`,
            [req.user.user_id]
        );
        res.json({ unread: parseInt(result.rows[0].unread) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch unread count.' });
    }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET is_read = TRUE
             WHERE notification_id = $1 AND user_id = $2`,
            [req.params.id, req.user.user_id]
        );
        res.json({ message: 'Marked as read.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update.' });
    }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', auth, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET is_read = TRUE
             WHERE user_id = $1`,
            [req.user.user_id]
        );
        res.json({ message: 'All marked as read.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update.' });
    }
});

module.exports = router;