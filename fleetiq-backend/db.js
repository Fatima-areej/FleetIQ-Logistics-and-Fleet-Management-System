/*

handles postgreSQL database connection using the pg library.
It reads database configuration from environment variables, 
establishes a connection pool, and exports the pool for use in other parts of the application. 

*/

// only import the Pool class from the pg library, which allows us to create a pool of database connections.
// instead of new connection for every query, we borrow a connection from the pool, use it, and then return it to the pool.

const { Pool } = require('pg');     //pg is postgreSQL client for Node.js. 
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

module.exports = pool;