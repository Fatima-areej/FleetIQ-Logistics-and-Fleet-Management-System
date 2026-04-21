/*

main entry point for the FleetIQ backend server. Sets up Express, middleware, and routes.

*/


const express = require('express');     //express is a framework to build web server
const cors    = require('cors');        //allows frontend and backend on different ports to communicate (Cross-Origin Resource Sharing)
require('dotenv').config();

const app = express();      //create an Express application object

// middleware (means for every request, do this first before going to route handlers)

app.use(cors());
app.use(express.json());    //allows us to parse JSON request bodies (sent by frontend) and access them via req.body in route handlers

// Routes

app.use('/api/auth',          require('./routes/auth'));        //if request starts with /api/auth, use the router defined in routes/auth.js
app.use('/api/org',           require('./routes/org'));
app.use('/api/shipments',     require('./routes/shipments'));
app.use('/api/drivers',       require('./routes/drivers'));
app.use('/api/vehicles',      require('./routes/vehicles'));
app.use('/api/warehouses',    require('./routes/warehouses'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/memos',         require('./routes/memos'));
app.use('/api/geo',           require('./routes/geo'));


// when someone sends GET request, run this function
// '/' means the root of the API, so http://localhost:5000/ will trigger this route handler

app.get('/', (req, res) => {
    res.json({ message: 'FleetIQ API is running.' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`FleetIQ server running on port ${PORT}`);
});