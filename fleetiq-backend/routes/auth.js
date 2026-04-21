/*

This file defines the authentication routes for the FleetIQ backend API. 
It handles user login and registration.

The login route verifies the user's credentials, checks if the account is active, and returns a JWT token if successful. 
The registration route creates a new user in the database with a hashed password.

*/

const express  = require('express');

// create a new router object from Express. 
// A router is like a mini-application that can have its own routes and middleware. 
// We use it to organize our route handlers into separate files.

const router   = express.Router();

const bcrypt   = require('bcryptjs');       //password hashing / checking
const jwt      = require('jsonwebtoken');   //JWT token creation
const pool     = require('../db');
require('dotenv').config();

// POST /api/auth/login

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // find user by email
        const result = await pool.query(
            `SELECT u.user_id, u.org_id, u.name, u.email,
                    u.password_hash, u.role, u.is_active
             FROM users u
             WHERE u.email = $1`,           // use parameterized query to prevent SQL injection
            [email]                 // the value for $1 in the query above comes from this array.
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated.' });
        }

        // verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // if driver, get driver_id too
        let driver_id = null;
        if (user.role === 'driver') {
            const driverResult = await pool.query(
                `SELECT driver_id FROM drivers WHERE user_id = $1`,
                [user.user_id]
            );
            if (driverResult.rows.length > 0) {
                driver_id = driverResult.rows[0].driver_id;
            }
        }

        // update last_login
        await pool.query(
            `UPDATE users SET last_login = NOW() WHERE user_id = $1`,
            [user.user_id]
        );

        // create JWT token
        const token = jwt.sign(
            {
                user_id:   user.user_id,
                org_id:    user.org_id,
                role:      user.role,
                name:      user.name,
                driver_id: driver_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                user_id:   user.user_id,
                org_id:    user.org_id,
                name:      user.name,
                email:     user.email,
                role:      user.role,
                driver_id: driver_id
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { org_id, name, email, password, role } = req.body;

    try {
        // check email not already taken
        const existing = await pool.query(
            `SELECT user_id FROM users WHERE email = $1`, [email]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        // hash password
        const password_hash = await bcrypt.hash(password, 10);

        // insert user
        const result = await pool.query(
            `INSERT INTO users (org_id, name, email, password_hash, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING user_id, org_id, name, email, role`,
            [org_id, name, email, password_hash, role]
        );

        const newUser = result.rows[0];

        // if driver role, create drivers row too
        if (role === 'driver') {
            await pool.query(
                `INSERT INTO drivers (user_id, license_number, experience_years)
                 VALUES ($1, $2, $3)`,
                [newUser.user_id, req.body.license_number || 'PENDING', req.body.experience_years || 0]
            );
        }

        res.status(201).json({
            message: 'User registered successfully.',
            user: newUser
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

module.exports = router;