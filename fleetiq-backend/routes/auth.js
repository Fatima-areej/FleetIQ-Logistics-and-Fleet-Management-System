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
    const emailNorm = String(email || '').trim();

    try {
        // find user by email (case-insensitive)
        const result = await pool.query(
            `SELECT u.user_id, u.org_id, u.name, u.email,
                    u.password_hash, u.role, u.is_active
             FROM users u
             WHERE LOWER(TRIM(u.email)) = LOWER(TRIM($1))`,
            [emailNorm]
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

// POST /api/auth/register : disabled for public multi-tenant safety (use register-organization or admin invite).
router.post('/register', async (req, res) => {
    return res.status(403).json({
        error: 'This endpoint is disabled. Create a new organization from the sign-up form on the login page, or ask your administrator to invite you under Team.',
    });
});

// POST /api/auth/register-organization , public: new company + first admin (multi-tenant onboarding)
router.post('/register-organization', async (req, res) => {
    const {
        organization_name,
        industry,
        phone,
        admin_name,
        email,
        password,
        confirm_password,
        authorized,
    } = req.body || {};

    const orgName = String(organization_name || '').trim();
    const adminName = String(admin_name || '').trim();
    const emailNorm = String(email || '').trim().toLowerCase();
    const industryTrim = industry ? String(industry).trim() : null;
    const phoneTrim = phone ? String(phone).trim() : null;

    if (!authorized) {
        return res.status(400).json({
            error: 'Please confirm you are authorized to register this organization.',
        });
    }
    if (orgName.length < 2 || orgName.length > 200) {
        return res.status(400).json({
            error: 'Organization name must be between 2 and 200 characters.',
        });
    }
    if (!adminName) {
        return res.status(400).json({ error: 'Your name is required.' });
    }
    if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ error: 'A valid work email is required.' });
    }
    if (!password || String(password).length < 8) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters.',
        });
    }
    if (String(password).length > 128) {
        return res.status(400).json({ error: 'Password is too long.' });
    }
    if (confirm_password != null && confirm_password !== password) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const client = await pool.connect();
    let committed = false;
    try {
        await client.query('BEGIN');        //transaction start

        const dupOrg = await client.query(
            `SELECT org_id FROM organizations
             WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))`,
            [orgName]
        );
        if (dupOrg.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'An organization with this name is already registered. Pick a different name or sign in.',
            });
        }

        const dupEmail = await client.query(
            `SELECT user_id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
            [emailNorm]
        );
        if (dupEmail.rows.length > 0) {
            await client.query('ROLLBACK');     //rollback transaction on error
            return res.status(409).json({
                error: 'This email is already registered. Sign in or use a different email.',
            });
        }

        const orgRes = await client.query(
            `INSERT INTO organizations (name, industry, contact_email, phone)
             VALUES ($1, $2, $3, $4)
             RETURNING org_id, name, industry, contact_email, phone, created_at`,
            [orgName, industryTrim || null, emailNorm, phoneTrim || null]
        );
        const org = orgRes.rows[0];

        const password_hash = await bcrypt.hash(password, 10);

        const userRes = await client.query(
            `INSERT INTO users (org_id, name, email, password_hash, role, is_active)
             VALUES ($1, $2, $3, $4, 'admin', TRUE)
             RETURNING user_id, org_id, name, email, role`,
            [org.org_id, adminName, emailNorm, password_hash]
        );
        const user = userRes.rows[0];

        await client.query('COMMIT');       //transaction commit   
        committed = true;

        const token = jwt.sign(
            {
                user_id:   user.user_id,
                org_id:    user.org_id,
                role:      user.role,
                name:      user.name,
                driver_id: null,
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Your organization is ready. Welcome to FleetIQ.',
            token,
            user: {
                user_id: user.user_id,
                org_id:  user.org_id,
                name:    user.name,
                email:   user.email,
                role:    user.role,
                driver_id: null,
            },
            organization: org,
        });
    } catch (err) {
        if (!committed) {
            try {
                await client.query('ROLLBACK');
            } catch (_) { /* ignore */ }
        }
        console.error('register-organization error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Could not complete registration. Try again later.' });
        }
    } finally {
        client.release();
    }
});

module.exports = router;