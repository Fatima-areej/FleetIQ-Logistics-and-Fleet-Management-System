/*

Role based internal communication system 

*/

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// ── GET /api/memos — received memos
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.*,
                    s.name AS sender_name,
                    s.role AS sender_role,
                    r.name AS receiver_name
             FROM memos m
             JOIN users s ON s.user_id = m.sender_id
             JOIN users r ON r.user_id = m.receiver_id
             WHERE m.receiver_id = $1
               AND m.parent_memo_id IS NULL
             ORDER BY m.created_at DESC`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch memos.' });
    }
});

// ── GET /api/memos/sent 
router.get('/sent', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.*,
                    r.name AS receiver_name,
                    r.role AS receiver_role
             FROM memos m
             JOIN users r ON r.user_id = m.receiver_id
             WHERE m.sender_id = $1
               AND m.parent_memo_id IS NULL
             ORDER BY m.created_at DESC`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch sent memos.' });
    }
});

// ── GET /api/memos/recipients — who can this user send to 
router.get('/recipients', auth, async (req, res) => {
    try {
        let query;
        let params = [req.user.org_id, req.user.user_id];

        if (req.user.role === 'admin') {
            // admin can send to anyone in org
            query = `
                SELECT user_id, name, email, role
                FROM users
                WHERE org_id = $1
                  AND user_id != $2
                  AND is_active = TRUE
                ORDER BY role, name`;

        } else if (req.user.role === 'manager') {
            // manager can send to anyone in org
            query = `
                SELECT user_id, name, email, role
                FROM users
                WHERE org_id = $1
                  AND user_id != $2
                  AND is_active = TRUE
                ORDER BY role, name`;

        } else {
            // driver can only send to managers of their warehouses
            query = `
                SELECT DISTINCT u.user_id, u.name, u.email, u.role
                FROM driver_managers_view dmv
                JOIN users u ON u.user_id = dmv.manager_user_id
                WHERE dmv.driver_user_id = $2
                  AND u.org_id = $1
                  AND u.is_active = TRUE
                ORDER BY u.name`;
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch recipients.' });
    }
});

// ── GET /api/memos/:id — single memo with thread 
router.get('/:id', auth, async (req, res) => {
    try {
        const memo = await pool.query(
            `SELECT m.*,
                    s.name AS sender_name,
                    s.role AS sender_role,
                    r.name AS receiver_name,
                    r.role AS receiver_role
             FROM memos m
             JOIN users s ON s.user_id = m.sender_id
             JOIN users r ON r.user_id = m.receiver_id
             WHERE m.memo_id = $1
               AND (m.sender_id = $2 OR m.receiver_id = $2)`,
            [req.params.id, req.user.user_id]
        );

        if (memo.rows.length === 0) {
            return res.status(404).json({ error: 'Memo not found.' });
        }

        const replies = await pool.query(
            `SELECT m.*,
                    s.name AS sender_name,
                    s.role AS sender_role
             FROM memos m
             JOIN users s ON s.user_id = m.sender_id
             WHERE m.parent_memo_id = $1
             ORDER BY m.created_at ASC`,
            [req.params.id]
        );

        // mark as read if receiver
        if (memo.rows[0].receiver_id === req.user.user_id) {
            await pool.query(
                `UPDATE memos SET is_read = TRUE
                 WHERE memo_id = $1`,
                [req.params.id]
            );
        }

        res.json({ memo: memo.rows[0], replies: replies.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch memo.' });
    }
});

// ── POST /api/memos — send a memo
router.post('/', auth, async (req, res) => {
    const { receiver_id, subject, body } = req.body;

    if (!receiver_id || !subject || !body) {
        return res.status(400).json({
            error: 'receiver_id, subject, and body are required.'
        });
    }

    try {
        // verify receiver exists in same org
        const receiverCheck = await pool.query(
            `SELECT user_id, role FROM users
             WHERE user_id = $1 AND org_id = $2 AND is_active = TRUE`,
            [receiver_id, req.user.org_id]
        );

        if (receiverCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Recipient not found in your organization.'
            });
        }

        const receiver = receiverCheck.rows[0];

        // enforce driver restriction — can only message their managers
        if (req.user.role === 'driver') {
            const allowed = await pool.query(
                `SELECT manager_user_id FROM driver_managers_view
                 WHERE driver_user_id = $1
                   AND manager_user_id = $2`,
                [req.user.user_id, receiver_id]
            );
            if (allowed.rows.length === 0) {
                return res.status(403).json({
                    error: 'Drivers can only message managers assigned to their warehouses.'
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO memos
                (org_id, sender_id, receiver_id, subject, body)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.user.org_id, req.user.user_id,
             receiver_id, subject, body]
        );

        res.status(201).json({
            message: 'Memo sent.',
            memo: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send memo.' });
    }
});

// ── POST /api/memos/:id/reply 
router.post('/:id/reply', auth, async (req, res) => {
    const { body } = req.body;

    if (!body?.trim()) {
        return res.status(400).json({ error: 'Reply body is required.' });
    }

    try {
        const original = await pool.query(
            `SELECT * FROM memos WHERE memo_id = $1`,
            [req.params.id]
        );

        if (original.rows.length === 0) {
            return res.status(404).json({ error: 'Memo not found.' });
        }

        const orig = original.rows[0];

        // reply goes back to whoever sent the original
        // (unless you are the original sender, then reply to receiver)
        const receiver_id = orig.sender_id === req.user.user_id
            ? orig.receiver_id
            : orig.sender_id;

        const result = await pool.query(
            `INSERT INTO memos
                (org_id, sender_id, receiver_id,
                 subject, body, parent_memo_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [req.user.org_id, req.user.user_id,
             receiver_id, 'Re: ' + orig.subject,
             body, req.params.id]
        );

        res.status(201).json({
            message: 'Reply sent.',
            memo: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send reply.' });
    }
});

// ── PATCH /api/memos/:id/read 
router.patch('/:id/read', auth, async (req, res) => {
    try {
        await pool.query(
            `UPDATE memos SET is_read = TRUE
             WHERE memo_id = $1 AND receiver_id = $2`,
            [req.params.id, req.user.user_id]
        );
        res.json({ message: 'Memo marked as read.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update memo.' });
    }
});

module.exports = router;