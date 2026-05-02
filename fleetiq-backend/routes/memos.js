/*

Role based internal communication system 

*/

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// ── GET /api/memos — all conversation threads (root memos) you participate in
router.get('/', auth, async (req, res) => {
    try {
        const uid = req.user.user_id;
        const result = await pool.query(
            `SELECT m.memo_id, m.org_id, m.sender_id, m.receiver_id, m.subject, m.body,
                    m.is_read, m.parent_memo_id, m.created_at,
                    s.name AS sender_name, s.role AS sender_role,
                    r.name AS receiver_name, r.role AS receiver_role,
                    CASE WHEN m.sender_id = $1 THEN r.name ELSE s.name END AS counterpart_name,
                    CASE WHEN m.sender_id = $1 THEN r.role ELSE s.role END AS counterpart_role,
                    (
                        SELECT MAX(x.created_at)
                        FROM memos x
                        WHERE x.memo_id = m.memo_id OR x.parent_memo_id = m.memo_id
                    ) AS last_activity_at,
                    (
                        (m.receiver_id = $1 AND m.is_read = FALSE)
                        OR EXISTS (
                            SELECT 1 FROM memos r2
                            WHERE r2.parent_memo_id = m.memo_id
                              AND r2.receiver_id = $1
                              AND r2.is_read = FALSE
                        )
                    ) AS thread_unread
             FROM memos m
             JOIN users s ON s.user_id = m.sender_id
             JOIN users r ON r.user_id = m.receiver_id
             WHERE m.parent_memo_id IS NULL
               AND (m.sender_id = $1 OR m.receiver_id = $1)
             ORDER BY last_activity_at DESC NULLS LAST, m.memo_id DESC`,
            [uid]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch memos.' });
    }
});

// ── GET /api/memos/sent — threads you started (optional filter); same shape as GET /
router.get('/sent', auth, async (req, res) => {
    try {
        const uid = req.user.user_id;
        const result = await pool.query(
            `SELECT m.memo_id, m.org_id, m.sender_id, m.receiver_id, m.subject, m.body,
                    m.is_read, m.parent_memo_id, m.created_at,
                    s.name AS sender_name, s.role AS sender_role,
                    r.name AS receiver_name, r.role AS receiver_role,
                    CASE WHEN m.sender_id = $1 THEN r.name ELSE s.name END AS counterpart_name,
                    CASE WHEN m.sender_id = $1 THEN r.role ELSE s.role END AS counterpart_role,
                    (
                        SELECT MAX(x.created_at)
                        FROM memos x
                        WHERE x.memo_id = m.memo_id OR x.parent_memo_id = m.memo_id
                    ) AS last_activity_at,
                    (
                        (m.receiver_id = $1 AND m.is_read = FALSE)
                        OR EXISTS (
                            SELECT 1 FROM memos r2
                            WHERE r2.parent_memo_id = m.memo_id
                              AND r2.receiver_id = $1
                              AND r2.is_read = FALSE
                        )
                    ) AS thread_unread
             FROM memos m
             JOIN users s ON s.user_id = m.sender_id
             JOIN users r ON r.user_id = m.receiver_id
             WHERE m.parent_memo_id IS NULL
               AND m.sender_id = $1
             ORDER BY last_activity_at DESC NULLS LAST, m.memo_id DESC`,
            [uid]
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

// Walk the parent chain in one recursive CTE instead of N round-trips.
async function resolveThreadRootId(client, memoId) {
    const result = await client.query(
        `WITH RECURSIVE chain AS (
             SELECT memo_id, parent_memo_id
             FROM   memos
             WHERE  memo_id = $1
             UNION ALL
             SELECT m.memo_id, m.parent_memo_id
             FROM   memos m
             JOIN   chain  c ON m.memo_id = c.parent_memo_id
         )
         SELECT memo_id FROM chain WHERE parent_memo_id IS NULL LIMIT 1`,
        [parseInt(memoId, 10)]
    );
    return result.rows[0]?.memo_id ?? null;
}

// ── GET /api/memos/:id — single memo with thread (always anchored at root)
router.get('/:id', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        const access = await client.query(
            `SELECT m.memo_id, m.parent_memo_id
             FROM memos m
             WHERE m.memo_id = $1
               AND (m.sender_id = $2 OR m.receiver_id = $2)`,
            [req.params.id, req.user.user_id]
        );
        if (access.rows.length === 0) {
            return res.status(404).json({ error: 'Memo not found.' });
        }

        const rootId = await resolveThreadRootId(client, req.params.id);
        if (!rootId) {
            return res.status(404).json({ error: 'Memo not found.' });
        }

        const memo = await client.query(
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
            [rootId, req.user.user_id]
        );

        if (memo.rows.length === 0) {
            return res.status(404).json({ error: 'Memo not found.' });
        }

        const replies = await client.query(
            `SELECT m.*,
                    s.name AS sender_name,
                    s.role AS sender_role
             FROM memos m
             JOIN users s ON s.user_id = m.sender_id
             WHERE m.parent_memo_id = $1
             ORDER BY m.created_at ASC`,
            [rootId]
        );

        await client.query(
            `UPDATE memos SET is_read = TRUE
             WHERE (memo_id = $1 OR parent_memo_id = $1)
               AND receiver_id = $2
               AND is_read = FALSE`,
            [rootId, req.user.user_id]
        );

        res.json({ memo: memo.rows[0], replies: replies.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch memo.' });
    } finally {
        client.release();
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

        if (orig.org_id !== req.user.org_id) {
            return res.status(404).json({ error: 'Memo not found.' });
        }
        if (orig.sender_id !== req.user.user_id && orig.receiver_id !== req.user.user_id) {
            return res.status(403).json({ error: 'You cannot reply to this memo.' });
        }

        const client = await pool.connect();
        try {
            const rootId = await resolveThreadRootId(client, req.params.id);
            if (!rootId) {
                return res.status(404).json({ error: 'Memo not found.' });
            }
            const rootRow = await client.query(
                `SELECT subject, sender_id, receiver_id, org_id
                 FROM memos WHERE memo_id = $1`,
                [rootId]
            );
            if (rootRow.rows.length === 0) {
                return res.status(404).json({ error: 'Memo not found.' });
            }
            const root = rootRow.rows[0];
            if (root.org_id !== req.user.org_id) {
                return res.status(404).json({ error: 'Memo not found.' });
            }
            if (root.sender_id !== req.user.user_id && root.receiver_id !== req.user.user_id) {
                return res.status(403).json({ error: 'You cannot reply to this memo.' });
            }

            // reply goes to the other party in this thread (based on the message you answer)
            const receiver_id = orig.sender_id === req.user.user_id
                ? orig.receiver_id
                : orig.sender_id;

            const subj = root.subject && root.subject.startsWith('Re: ')
                ? root.subject
                : `Re: ${root.subject}`;

            const result = await client.query(
                `INSERT INTO memos
                    (org_id, sender_id, receiver_id,
                     subject, body, parent_memo_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [req.user.org_id, req.user.user_id,
                 receiver_id, subj,
                 body, rootId]
            );

            res.status(201).json({
                message: 'Reply sent.',
                memo: result.rows[0]
            });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send reply.' });
    }
});

// ── PATCH /api/memos/:id/read — mark entire thread read for current user
router.patch('/:id/read', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        const rootId = await resolveThreadRootId(client, req.params.id);
        if (!rootId) {
            return res.status(404).json({ error: 'Memo not found.' });
        }
        await client.query(
            `UPDATE memos SET is_read = TRUE
             WHERE (memo_id = $1 OR parent_memo_id = $1)
               AND receiver_id = $2`,
            [rootId, req.user.user_id]
        );
        res.json({ message: 'Memo marked as read.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update memo.' });
    } finally {
        client.release();
    }
});

module.exports = router;