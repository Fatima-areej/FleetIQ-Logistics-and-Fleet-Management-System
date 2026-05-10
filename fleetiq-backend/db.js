/*

Database Connection + security context layer. It:

connects Node.js to PostgreSQL
manages database transactions
passes the logged-in user identity into PostgreSQL for RLS policies

*/

const { Pool } = require('pg'); //postgresql library for Node.js
require('dotenv').config();

const pool = new Pool({                 //creating connection pool
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

//Event listeners 

pool.on('connect', () => {
    console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Database error:', err);
});

/*

This function: creates database client, starts a transaction, sets the user context for RLS, 
executes the provided callback function (which contains the actual database operations), 
commits the transaction if successful, 
rolls back if there's an error,
and finally releases the client back to the pool.

*/

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
