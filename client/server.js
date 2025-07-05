const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${ENV}` });

const app = express();
const PORT = process.env.PORT || 3000;

// Configure MIME types for modules
express.static.mime.define({'application/javascript': ['js', 'mjs']});

// Serve static files (prioritize dist for production)
app.use(express.static('dist'));
app.use(express.static('.'));

// Serve main HTML file (prioritize dist for production)
app.get('/', (req, res) => {
    const distIndexPath = path.join(__dirname, 'dist', 'index.html');
    const devIndexPath = path.join(__dirname, 'index.html');
    
    // Try to serve from dist first (production build), fallback to dev
    const fs = require('fs');
    if (fs.existsSync(distIndexPath)) {
        res.sendFile(distIndexPath);
    } else {
        res.sendFile(devIndexPath);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'snatchgame-client',
        environment: ENV,
        serverUrl: process.env.SERVER_URL
    });
});

// API endpoint to get environment config for client
app.get('/api/config', (req, res) => {
    res.json({
        serverUrl: process.env.SERVER_URL,
        environment: ENV
    });
});

app.listen(PORT, () => {
    console.log(`
🎮 SnatchGame Client Server
📱 Environment: ${ENV}
🌐 Server URL: http://localhost:${PORT}
🔗 Game Server: ${process.env.SERVER_URL}
    `);
});