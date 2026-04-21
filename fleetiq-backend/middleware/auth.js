/*

This is code that runs before route handlers to check if the user is authenticated. 
It checks for a JWT token in the Authorization header, verifies it, 
and attaches the decoded user information to the request object for use in subsequent handlers.

It works sort of like a security checkpoint. 

*/


const jwt = require('jsonwebtoken');    // imports the jsonwebtoken library to handle JWT tokens
require('dotenv').config();             // loads environment variables from the .env file, which includes "JWT_SECRET"    

//require('dotenv') imports the dotenv library and .config() tells it to read the .env file 
// and load the variables into process.env. 
// This allows us to access process.env.JWT_SECRET later in the code, which is used to verify the JWT token.

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { user_id, org_id, role, name }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};


// In Node, every JS file is a module. 
// When you require() a file, it executes that file and returns whatever is assigned to module.exports.


// (req, res, next) are automatically provided by Express. 
// req is the request object (contains all request data - sent by frontend), 
// res is the response object (goes back where request came from),
// and next is a function that you call to go to the next middleware or route handler.