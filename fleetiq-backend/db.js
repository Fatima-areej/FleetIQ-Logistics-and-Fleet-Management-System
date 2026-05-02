const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Database error:', err);
});

// Wraps a callback in a transaction that sets app.current_user_id for the
// duration of that transaction only (used by audit triggers).
// SET LOCAL ROLE is intentionally omitted while the app connects as a
// superuser (postgres): switching to a limited role would lose superuser
// privileges and break trigger writes to shipment_status_history and others.
// When the connection is migrated to the fleetiq_app non-superuser, re-add
// SET LOCAL ROLE here and grant INSERT on shipment_status_history to
// fleet_manager / fleet_driver (and make trigger functions SECURITY DEFINER).
async function withRLSClient(userId, _role, callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            `SELECT set_config('app.current_user_id', $1, true)`,
            [String(userId)]
        );
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Sets user context at the start of an already-open transaction.
// Must be called AFTER BEGIN and BEFORE any DML or CALL.
async function setRLSContext(client, userId, _role) {
    await client.query(
        `SELECT set_config('app.current_user_id', $1, true)`,
        [String(userId)]
    );
}

module.exports = pool;
module.exports.withRLSClient = withRLSClient;
module.exports.setRLSContext = setRLSContext;
